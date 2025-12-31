/// Weighted Median Algorithm
///
/// ANTI-SYBIL MECHANISM:
/// Traditional median: Each vote counts equally → Sybil can spam votes
/// Weighted median: Each vote weighted by contribution → Sybil must spend real money
///
/// Example:
/// - Attacker: 100 wallets × $10 = $1000 total, each voting for $100 budget
/// - Legitimate donor: 1 wallet × $1000, voting for $500 budget
/// - Traditional median: $100 (attacker wins with 100 votes vs 1)
/// - Weighted median: $500 (both have equal weight of $1000)
///
/// Algorithm:
/// 1. Sort all votes by proposed_budget
/// 2. Find the budget where cumulative weight crosses 50% of total weight

pub struct WeightedVote {
    pub proposed_budget: u64,
    pub weight: u64,
}

/// Calculate weighted median from votes
pub fn calculate_weighted_median(mut votes: Vec<WeightedVote>) -> u64 {
    if votes.is_empty() {
        return 0;
    }

    // Sort by proposed_budget ascending
    votes.sort_by_key(|v| v.proposed_budget);

    // Calculate total weight
    let total_weight: u64 = votes.iter().map(|v| v.weight).sum();
    let half_weight = total_weight / 2;

    // Find median
    let mut cumulative_weight = 0u64;
    for vote in &votes {
        cumulative_weight += vote.weight;
        if cumulative_weight >= half_weight {
            return vote.proposed_budget;
        }
    }

    // Fallback (should never reach here if votes non-empty)
    votes.last().unwrap().proposed_budget
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weighted_median_equal_weights() {
        let votes = vec![
            WeightedVote { proposed_budget: 100, weight: 10 },
            WeightedVote { proposed_budget: 200, weight: 10 },
            WeightedVote { proposed_budget: 300, weight: 10 },
        ];

        let median = calculate_weighted_median(votes);
        assert_eq!(median, 200);
    }

    #[test]
    fn test_weighted_median_unequal_weights() {
        // Sybil attack scenario
        let votes = vec![
            // Attacker: 10 votes × $1 each = $10 total weight, all voting $50
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            WeightedVote { proposed_budget: 50, weight: 1 },
            // Legitimate donor: 1 vote × $100 weight, voting $200
            WeightedVote { proposed_budget: 200, weight: 100 },
        ];

        let median = calculate_weighted_median(votes);
        // Despite 10 attacker votes vs 1 legitimate vote,
        // median should be $200 because legitimate donor has more weight ($100 > $10)
        assert_eq!(median, 200);
    }

    #[test]
    fn test_weighted_median_resistance_to_outliers() {
        let votes = vec![
            WeightedVote { proposed_budget: 100, weight: 50 },
            WeightedVote { proposed_budget: 150, weight: 50 },
            WeightedVote { proposed_budget: 200, weight: 50 },
            // Outlier with low weight
            WeightedVote { proposed_budget: 10000, weight: 1 },
        ];

        let median = calculate_weighted_median(votes);
        // Median should be ~150-200, not influenced by extreme outlier
        assert!(median >= 150 && median <= 200);
    }

    #[test]
    fn test_single_vote() {
        let votes = vec![
            WeightedVote { proposed_budget: 500, weight: 100 },
        ];

        let median = calculate_weighted_median(votes);
        assert_eq!(median, 500);
    }
}
