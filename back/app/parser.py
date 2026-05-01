def clean_sequence(seq):
    seq = seq.upper()
    seq = seq.replace("\n", "").replace(" ", "")
    return seq

def validate_sequence(seq):
    valid = set("ATGC")
    return all(base in valid for base in seq)

def parse_fasta(fasta_text):
    lines = fasta_text.strip().split("\n")
    
    sequence = ""
    for line in lines:
        if line.startswith(">"):
            continue
        sequence += line.strip()
    
    return sequence.upper()