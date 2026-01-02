use budget_vote::weighted_median::*;

#[test]
fn test_weighted_median_simple() {
    let votes = vec![
        WeightedVote { proposed_budget: 100, weight: 10 },
        WeightedVote { proposed_budget: 200, weight: 10 },
        WeightedVote { proposed_budget: 300, weight: 10 },
    ];

    let median = calculate_weighted_median(votes);
    assert_eq!(median, 200, "Median of equal weights should be middle value");
}

#[test]
fn test_weighted_median_heavy_weight() {
    let votes = vec![
        WeightedVote { proposed_budget: 100, weight: 1 },
        WeightedVote { proposed_budget: 200, weight: 100 }, // Heavy weight
        WeightedVote { proposed_budget: 300, weight: 1 },
    ];

    let median = calculate_weighted_median(votes);
    assert_eq!(median, 200, "Heavy weight should dominate median");
}

#[test]
fn test_weighted_median_sybil_attack() {
    // Scenario: 1 legitimate donor with $100, 10 bots with $10 each trying to manipulate
    let mut votes = vec![
        WeightedVote { proposed_budget: 1000, weight: 100_000_000 }, // $100 USDC (6 decimals)
    ];

    // 10 bots trying to vote for low budget
    for _ in 0..10 {
        votes.push(WeightedVote {
            proposed_budget: 100,
            weight: 10_000_000, // $10 USDC each = $100 total
        });
    }

    let median = calculate_weighted_median(votes);

    // The $100 donor should have equal weight to all 10 bots combined
    // So median should be somewhere in between, not dominated by bot count
    assert!(
        median >= 500,
        "Median should not be dominated by bot count. Got: {}",
        median
    );
}

#[test]
fn test_weighted_median_anti_sybil() {
    // Real-world scenario: Anti-Sybil test
    // Legitimate donors: 3 people with $50 each voting for ~$5000 budget
    // Sybil attack: 100 fake wallets with $10 each voting for $100 budget

    let mut votes = vec![
        WeightedVote { proposed_budget: 5000_000_000, weight: 50_000_000 },
        WeightedVote { proposed_budget: 4800_000_000, weight: 50_000_000 },
        WeightedVote { proposed_budget: 5200_000_000, weight: 50_000_000 },
    ];

    // Sybil attack: 100 bots
    for _ in 0..100 {
        votes.push(WeightedVote {
            proposed_budget: 100_000_000, // $100
            weight: 10_000_000,           // $10 each
        });
    }

    let median = calculate_weighted_median(votes);

    // Total legitimate weight: $150
    // Total Sybil weight: $1000
    // Sybils have more total money, so they should influence the result
    // But they can't completely dominate because weighted median is used
    // The result should be closer to the Sybil value since they have more weight

    // With weighted median, the value at 50% of cumulative weight wins
    // Total weight = $1150
    // 50% = $575
    // Cumulative: Sybils ($1000) + Legitimate ($150)
    // Since Sybils have $1000 out of $1150, they will dominate

    println!("Median with Sybil attack: {}", median);
    assert!(
        median < 5000_000_000,
        "Sybils with more money should influence result"
    );
}

#[test]
fn test_weighted_median_single_vote() {
    let votes = vec![WeightedVote { proposed_budget: 500, weight: 100 }];

    let median = calculate_weighted_median(votes);
    assert_eq!(median, 500, "Single vote should return that value");
}

#[test]
fn test_weighted_median_two_equal_weights() {
    let votes = vec![
        WeightedVote { proposed_budget: 100, weight: 50 },
        WeightedVote { proposed_budget: 200, weight: 50 },
    ];

    let median = calculate_weighted_median(votes);
    assert_eq!(median, 100, "With equal weights, should return first value at 50% threshold");
}

#[test]
fn test_weighted_median_outlier_resistance() {
    // Weighted median is resistant to outliers
    let votes = vec![
        WeightedVote { proposed_budget: 100, weight: 10 },
        WeightedVote { proposed_budget: 110, weight: 10 },
        WeightedVote { proposed_budget: 105, weight: 10 },
        WeightedVote { proposed_budget: 1_000_000, weight: 1 }, // Outlier with low weight
    ];

    let median = calculate_weighted_median(votes);
    assert!(
        median < 200,
        "Outlier with low weight should not affect median significantly. Got: {}",
        median
    );
}
