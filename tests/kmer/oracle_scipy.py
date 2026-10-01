"""Independent oracle: k-mer weighted-Jaccard distances + scipy average linkage, from FASTA on stdin-like args.
usage: python oracle_scipy.py file.fa k   -> prints JSON {dist: [[...]], heights: [...], cuts: {g: [labels...]}}"""
import sys, json, re
from collections import Counter
import numpy as np
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform

def read(path):
    seqs = []
    for b in open(path).read().split('>')[1:]:
        l = b.split('\n'); seqs.append(''.join(l[1:]))
    return seqs

def kmers(seq, k):
    s = re.sub('[^ACGT]', '', seq.upper().replace('U', 'T'))
    return Counter(s[i:i + k] for i in range(len(s) - k + 1))

def dist_matrix(seqs, k):
    P = [kmers(s, k) for s in seqs]; n = len(P); D = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            a, b = P[i], P[j]
            keys = set(a) | set(b)
            shared = sum(min(a[x], b[x]) for x in keys); total = sum(max(a[x], b[x]) for x in keys)
            D[i, j] = D[j, i] = (1 - shared / total) if total > 0 else 1.0
    return D

if __name__ == '__main__':
    seqs = read(sys.argv[1]); k = int(sys.argv[2]); n = len(seqs)
    D = dist_matrix(seqs, k)
    Z = linkage(squareform(D, checks=False), 'average')
    # smallest margin between the best and the next-best pair over a plain double-precision UPGMA:
    # a margin near 0 means the tree is not unique (ties are broken by rounding noise, differently by every program)
    A = D.copy().astype(np.float64); np.fill_diagonal(A, np.inf); act = list(range(n)); sz = {i: 1 for i in range(n)}; margin = np.inf
    for _ in range(n - 1):
        sub = A[np.ix_(act, act)]; flat = np.sort(sub[np.triu_indices(len(act), 1)])
        if len(flat) > 1: margin = min(margin, flat[1] - flat[0])
        i, j = np.unravel_index(np.argmin(sub), sub.shape); a, b = act[i], act[j]
        for c in act:
            if c in (a, b): continue
            A[a, c] = A[c, a] = (A[a, c] * sz[a] + A[b, c] * sz[b]) / (sz[a] + sz[b])
        sz[a] += sz[b]; act.remove(b)
    out = {'dist': D.tolist(), 'heights': Z[:, 2].tolist(), 'cuts': {}, 'margin': float(margin)}
    for g in range(1, n + 1):
        out['cuts'][str(g)] = fcluster(Z, g, 'maxclust').tolist()
    print(json.dumps(out))
