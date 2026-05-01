import joblib
import os

def extract_features(seq1, seq2):
    length = min(len(seq1), len(seq2))

    substitutions = 0
    transitions = 0
    transversions = 0

    transition_pairs = [('A','G'), ('G','A'), ('C','T'), ('T','C')]

    for i in range(length):
        if seq1[i] != seq2[i]:
            substitutions += 1

            if (seq1[i], seq2[i]) in transition_pairs:
                transitions += 1
            else:
                transversions += 1

    mutation_rate = substitutions / length if length > 0 else 0

    return [
        substitutions,
        transitions,
        transversions,
        mutation_rate,
        length
    ]

import random

def generate_dataset(n=100):
    X = []
    y = []

    bases = ['A', 'T', 'G', 'C']

    for _ in range(n):
        length = random.randint(8, 20)

        seq1 = ''.join(random.choice(bases) for _ in range(length))
        seq2 = list(seq1)

        num_mutations = random.randint(0, length // 2)

        for _ in range(num_mutations):
            idx = random.randint(0, length - 1)
            seq2[idx] = random.choice(bases)

        seq2 = ''.join(seq2)

        features = extract_features(seq1, seq2)

        label = 1 if features[3] > 0.3 else 0 

        X.append(features)
        y.append(label)

    return X, y


from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix

def train_model():
    X, y = generate_dataset(200)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = DecisionTreeClassifier()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    print("Model Accuracy:", accuracy)
    print("Confusion Matrix:")
    print(cm)

    joblib.dump(model, "dna_model.pkl")
    print("Model saved as dna_model.pkl")

    return model

def load_model():
    path = os.path.join(os.path.dirname(__file__), "..", "dna_model.pkl")
    path = os.path.abspath(path)

    model = joblib.load(path)
    return model