from fastapi import FastAPI
from pydantic import BaseModel

from app.parser import clean_sequence, validate_sequence
from app.mutation import detect_substitution, detect_indel, find_motif, gc_content

from fastapi.middleware.cors import CORSMiddleware

from app.ml_model import extract_features
from app.ml_model import generate_dataset
from app.ml_model import train_model
from app.ml_model import load_model, extract_features
from app.alignment import needleman_wunsch

app = FastAPI()
model = load_model()

X, y = generate_dataset(5)
print(X)
print(y)



print(extract_features("ATGCCGTA", "ATGACGTT"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DNARequest(BaseModel):
    sequence1: str
    sequence2: str
    motif: str


@app.post("/analyze")
def analyze_dna(data: DNARequest):
    seq1 = clean_sequence(data.sequence1)
    seq2 = clean_sequence(data.sequence2)

    if not validate_sequence(seq1) or not validate_sequence(seq2):
        return {"error": "Invalid DNA sequence"}

    aligned1, aligned2 = needleman_wunsch(seq1, seq2)

    mutations = []
    indels = []

    pos = 0  # position in aligned sequence

    for i in range(len(aligned1)):
        a = aligned1[i]
        b = aligned2[i]

        if a == b:
            pos += 1
            continue

        if a != "-" and b != "-":
            # substitution
            mutations.append({
                "type": "substitution",
                "pos": pos,
                "from": a,
                "to": b
            })
            pos += 1

        elif a == "-" and b != "-":
            # insertion
            indels.append({
                "type": "insertion",
                "pos": pos,
                "from": "-",
                "to": b
            })

        elif a != "-" and b == "-":
            # deletion
            indels.append({
                "type": "deletion",
                "pos": pos,
                "from": a,
                "to": "-"
            })
            pos += 1
    motifs = find_motif(seq1, data.motif)
    gc = gc_content(seq1)

    features = extract_features(seq1, seq2)
    prediction = model.predict([features])[0]

    # --- INTERPRETATION LOGIC ---
    all_mutations = mutations + indels
    seq_len = len(seq1)

    mutation_positions = [m["pos"] for m in all_mutations if "pos" in m]

    # REGION DETECTION
    if len(mutation_positions) > 0:
        avg_pos = sum(mutation_positions) / len(mutation_positions)
        ratio = avg_pos / seq_len
    else:
        ratio = 0

    if ratio < 0.3:
        region = "Regulatory Region"
        system = "Gene regulation / hormonal control"
    elif ratio < 0.7:
        region = "Coding Region"
        system = "Protein synthesis (enzymes, muscles)"
    else:
        region = "Structural Region"
        system = "DNA stability / cellular integrity"

    # MUTATION TYPE
    subs = [m for m in mutations if m["from"] != "-" and m["to"] != "-"]
    ins = [m for m in indels if m.get("type") == "insertion"]
    dels = [m for m in indels if m.get("type") == "deletion"]

    if len(subs) >= len(ins) and len(subs) >= len(dels):
        mtype = "Substitution Dominant"
    elif len(ins) >= len(dels):
        mtype = "Insertion Dominant"
    else:
        mtype = "Deletion Dominant"

    # CLUSTER DETECTION
    is_clustered = False
    if len(mutation_positions) > 2:
        mutation_positions.sort()
        gaps = [
            mutation_positions[i+1] - mutation_positions[i]
            for i in range(len(mutation_positions)-1)
        ]
        if min(gaps) < 3:
            is_clustered = True

    # MOTIF IMPACT
    motif_flag = False
    motif_len = len(data.motif)

    for m in mutation_positions:
        for pos in motifs:
            if m >= pos and m < pos + motif_len:
                motif_flag = True
                break

    # REASON GENERATION
    if len(all_mutations) == 0:
        reason = "No mutations detected"
    elif is_clustered:
        reason = "Clustered mutations causing localized damage"
    elif len(all_mutations) > 5:
        reason = "High mutation density across sequence"
    else:
        reason = "Moderate mutation activity"

    # FINAL INTERPRETATION
    interpretation = {
        "risk": "HIGH" if prediction == 1 else "LOW",
        "type": mtype,
        "region": region,
        "affected_system": system,
        "reason": reason,
        "clustered": is_clustered,
        "motif_affected": motif_flag
    }

    return {
        "status": "success",
        "data": {
            "mutations": mutations,
            "indels": indels,
            "motif_positions": motifs,
            "gc_content": gc,
            "prediction": int(prediction),
            "interpretation": interpretation,
            "alignment": {
    "seq1": aligned1,
    "seq2": aligned2
}
        }
    }