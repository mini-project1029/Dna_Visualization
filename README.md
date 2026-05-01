# DNA Visualization and Mutation Analysis Platform

## Description
This project visualizes DNA sequences in a 3D helix and performs mutation detection, motif search, and GC content analysis.

---

## Tech Stack
- Frontend: React + Three.js
- Backend: FastAPI (Python)
- ML: Scikit-learn

---

## Project Structure
backend/ → FastAPI server  
dna-visualization/ → React frontend  

---

## How to Run

### 1. Clone the Repository
git clone https://github.com/your-username/your-repo-name.git  
cd your-repo-name  

---

### 2. Run Backend

cd backend  

Create virtual environment:
python -m venv venv  

Activate:
venv\Scripts\activate   (Windows)

Install dependencies:
pip install -r requirements.txt  

Run server:
uvicorn main:app --reload  

Backend runs on:
http://127.0.0.1:8000  

---

### 3. Run Frontend

Open new terminal:

cd dna-visualization  

Install dependencies:
npm install  

Start frontend:
npm run dev  

Frontend runs on:
http://localhost:5173  

---

## Usage
1. Enter DNA sequences  
2. Enter motif  
3. Click ANALYZE  
4. View:
   - Mutations (purple)
   - Motifs (cyan)
   - GC content
5. Click on bases for detailed info  

---

## Notes
- Do NOT upload node_modules or venv  
- Ensure backend is running before frontend  
