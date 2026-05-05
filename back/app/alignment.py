def needleman_wunsch(seq1, seq2, match=1, mismatch=-1, gap=-1):
    n = len(seq1)
    m = len(seq2)

    # DP matrix
    dp = [[0]*(m+1) for _ in range(n+1)]

    # Initialize
    for i in range(n+1):
        dp[i][0] = i * gap
    for j in range(m+1):
        dp[0][j] = j * gap

    # Fill DP
    for i in range(1, n+1):
        for j in range(1, m+1):
            if seq1[i-1] == seq2[j-1]:
                score = match
            else:
                score = mismatch

            dp[i][j] = max(
                dp[i-1][j-1] + score,  # match/mismatch
                dp[i-1][j] + gap,      # deletion
                dp[i][j-1] + gap       # insertion
            )

    # Traceback
    aligned1 = ""
    aligned2 = ""

    i, j = n, m

    while i > 0 or j > 0:
        if i > 0 and j > 0 and (
            dp[i][j] == dp[i-1][j-1] + (match if seq1[i-1] == seq2[j-1] else mismatch)
        ):
            aligned1 = seq1[i-1] + aligned1
            aligned2 = seq2[j-1] + aligned2
            i -= 1
            j -= 1

        elif i > 0 and dp[i][j] == dp[i-1][j] + gap:
            aligned1 = seq1[i-1] + aligned1
            aligned2 = "-" + aligned2
            i -= 1

        else:
            aligned1 = "-" + aligned1
            aligned2 = seq2[j-1] + aligned2
            j -= 1

    return aligned1, aligned2