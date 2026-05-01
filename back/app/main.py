from fastapi import FastAPI
from pydantic import BaseModel

from app.parser import clean_sequence, validate_sequence
from app.mutation import detect_substitution, detect_indel, find_motif, gc_content

from fastapi.middleware.cors import CORSMiddleware

from app.ml_model import extract_features
from app.ml_model import generate_dataset
from app.ml_model import train_model
from app.ml_model import load_model, extract_features

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

    mutations = detect_substitution(seq1, seq2)
    indels = detect_indel(seq1, seq2)
    motifs = find_motif(seq1, data.motif)
    gc = gc_content(seq1)

    features = extract_features(seq1, seq2)
    prediction = model.predict([features])[0]

    return{
        "status": "success",
        "data": {
            "mutations": mutations,
            "indels": indels,
            "motif_positions": motifs,
            "gc_content": gc,
            "prediction": int(prediction)
        }
    }