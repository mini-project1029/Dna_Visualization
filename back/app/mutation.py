def detect_substitution(seq1, seq2):
    mutations = []

    min_len = min(len(seq1), len(seq2))

    for i in range(min_len):
        if seq1[i] != seq2[i]:
            mutations.append({
                "pos": i,
                "type": "substitution",
                "from": seq1[i],
                "to": seq2[i]
            })

    return mutations

def detect_indel(seq1, seq2):
    mutations = []
    
    i = 0
    j = 0

    while i < len(seq1) and j < len(seq2):
        if seq1[i] == seq2[j]:
            i += 1
            j += 1
        else:
            if j + 1 < len(seq2) and seq1[i] == seq2[j+1]:
                mutations.append({
                    "pos": j,
                    "type": "insertion",
                    "base": seq2[j]
                })
                j += 1
            elif i + 1 < len(seq1) and seq1[i+1] == seq2[j]:
                mutations.append({
                    "pos": i,
                    "type": "deletion",
                    "base": seq1[i]
                })
                i += 1
            else:
                mutations.append({
                    "pos": i,
                    "type": "substitution",
                    "from": seq1[i],
                    "to": seq2[j]
                })
                i += 1
                j += 1

    return mutations

def find_motif(sequence, motif):
    positions = []

    for i in range(len(sequence) - len(motif) + 1):
        if sequence[i:i+len(motif)] == motif:
            positions.append(i)

    return positions

def gc_content(sequence):
    g = sequence.count("G")
    c = sequence.count("C")
    total = len(sequence)

    if total == 0:
        return 0

    return ((g + c) / total) * 100