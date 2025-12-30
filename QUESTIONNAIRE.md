# OpenBook Protocol V0 - Comprehensive Build Questionnaire

**INSTRUCTIONS:** Please answer ALL questions below. Your answers will determine the exact implementation details for the entire system. Be as specific as possible. Use "TBD" only if you genuinely need to research further, but try to provide initial direction.

---

## SECTION 1: CRITICAL SCOPE DECISIONS (MUST LOCK BEFORE CODING)

### 1.1 Funding Model
**Q1:** Do you want campaign-level pooled balances in addition to task-level escrow?
- [ ] YES - Campaigns can hold a general pool that can be allocated to tasks
- [ ] NO - Only task-level escrow (RECOMMENDED in docs)

**Q2:** If YES to campaign pooling, who can allocate from campaign pool to tasks?
- Campaign creator only
- Campaign creator + donors vote
- Other (specify): _______________

### 1.2 Budget Discovery Mechanism
**Q3:** Confirm the weighted median approach for budget finalization:
- [ ] Confirmed - Use weighted median
- [ ] Alternative (specify): _______________

**Q4:** What should vote weights be based on? (Choose ONE for v0)
- [ ] Task-specific contributions only (RECOMMENDED - safer)
- [ ] Campaign-wide contributions (riskier - gaming potential)
- [ ] Hybrid formula (specify): _______________

**Q5:** Should there be a minimum vote threshold (quorum) before budget can be finalized?
- [ ] YES - Require minimum participation
- [ ] NO - Any votes count

**Q6:** If YES to quorum, what should the threshold be?
- Minimum number of voters: _______________
- OR minimum total contribution amount: _______________
- OR minimum percentage of total funds: _______________%

### 1.3 Approval Model (CRITICAL - Choose ONE for v0)
**Q7:** How should task completion be approved before payout?
- [ ] **Option A:** Donor approval vote (donors vote to approve proof)
- [ ] **Option B:** Designated reviewer approval with stake
- [ ] **Option C:** Hybrid (reviewer approves + donors can veto within timeframe)

**Q8:** If Option A (Donor approval):
- Vote weight based on contribution amount? [ ] YES [ ] NO
- Approval threshold: ______% of voting power needed
- Voting period duration: ______ days
- What happens if quorum not reached: [ ] Auto-approve [ ] Auto-reject [ ] Extend period

**Q9:** If Option B (Reviewer approval):
- Who assigns reviewers: [ ] Campaign creator [ ] Task creator [ ] DAO/Community
- Reviewer stake amount: ______ USDC
- Stake slashing conditions: _______________
- Appeal mechanism: [ ] YES [ ] NO

**Q10:** If Option C (Hybrid):
- Reviewer approval required first? [ ] YES [ ] NO
- Donor veto period: ______ days
- Veto threshold: ______% of donors must veto
- Veto weight: [ ] Equal per donor [ ] Weighted by contribution

### 1.4 Receipt Tokens
**Q11:** Should the system issue SPL tokens as contribution receipts?
- [ ] YES - Issue SPL receipt tokens (enables secondary markets, more complex)
- [ ] NO - Use PDA-based receipts only (RECOMMENDED - simpler)

**Q12:** If YES to receipt tokens:
- Token name/symbol: _______________
- Transferable? [ ] YES [ ] NO
- Fungible or NFT-based: [ ] Fungible [ ] NFT [ ] Semi-fungible
- Use case beyond proof of contribution: _______________

### 1.5 Dispute Resolution
**Q13:** Who can initiate disputes? (Select all that apply)
- [ ] Task recipient
- [ ] Any donor
- [ ] Campaign creator
- [ ] Designated moderators
- [ ] Other: _______________

**Q14:** What triggers can justify a dispute?
- [ ] Proof quality concerns
- [ ] Missed deadline
- [ ] Scope deviation
- [ ] Fraud suspicion
- [ ] Other: _______________

**Q15:** For v0, how should disputes be resolved?
- [ ] Platform admin decision (centralized, fast)
- [ ] Multi-sig committee vote
- [ ] Donor vote
- [ ] External arbitration service
- [ ] Other: _______________

**Q16:** Dispute resolution outcomes: (Select all that apply)
- [ ] Full payout to recipient
- [ ] Partial payout to recipient
- [ ] Full refund to donors
- [ ] Partial refund, partial payout
- [ ] Funds held for re-vote

**Q17:** Dispute resolution timeframe:
- Maximum time to resolve: ______ days
- Default outcome if not resolved in time: _______________

---

## SECTION 2: TECHNICAL ARCHITECTURE

### 2.1 Solana Program Architecture
**Q18:** Preferred Anchor framework version:
- [ ] Latest stable (recommended)
- [ ] Specific version: _______________

**Q19:** Program upgrade authority:
- [ ] Multisig (RECOMMENDED)
- [ ] Single admin key (for testing only)
- Number of signers if multisig: _______________
- Threshold: ______ of ______ signers

**Q20:** Should programs be upgradeable on mainnet?
- [ ] YES - With multisig control
- [ ] NO - Deploy as immutable (more secure but inflexible)

### 2.2 Account Structure
**Q21:** Maximum number of tasks per campaign:
- ______ tasks (affects account size, suggest: 100)

**Q22:** Maximum number of budget votes per task:
- ______ votes (affects account size, suggest: 1000)

**Q23:** Maximum campaign metadata size:
- Title: ______ characters (suggest: 100)
- Description: ______ characters (suggest: 5000)
- Media URLs: ______ URLs (suggest: 10)

**Q24:** Maximum task metadata size:
- Title: ______ characters (suggest: 100)
- Deliverables: ______ characters (suggest: 2000)
- Proof URL/hash: ______ bytes (suggest: 200)

### 2.3 Economic Parameters
**Q25:** Minimum contribution amount:
- ______ USDC (suggest: 1 USDC to prevent spam)

**Q26:** Minimum task budget:
- ______ USDC (suggest: 10 USDC)

**Q27:** Maximum task budget (if any):
- [ ] No maximum
- [ ] Maximum: ______ USDC

**Q28:** Platform fees:
- [ ] NO fees (pure protocol, RECOMMENDED for v0)
- [ ] YES - Fee structure: ______ % or ______ flat USDC
- If YES, who receives fees: _______________

**Q29:** Refund policy:
- [ ] Full refunds on task rejection/failure
- [ ] Partial refunds (deduct gas/operational costs)
- If partial, deduction amount/formula: _______________

### 2.4 Timing Parameters
**Q30:** Budget voting period:
- Minimum: ______ days
- Maximum: ______ days
- Default if not specified: ______ days

**Q31:** Task execution deadline:
- Can creators set custom deadlines? [ ] YES [ ] NO
- Minimum deadline: ______ days
- Maximum deadline: ______ days
- Default deadline: ______ days

**Q32:** Proof review period:
- ______ days for approval/rejection after submission

**Q33:** Refund claim period:
- Donors have ______ days to claim refunds after task rejection
- After period expires: [ ] Funds remain in escrow [ ] Automatically distributed

---

## SECTION 3: KYC & COMPLIANCE

### 3.1 KYC Provider Selection
**Q34:** Preferred KYC provider:
- [ ] Civic Pass
- [ ] Veriff
- [ ] Onfido
- [ ] Persona
- [ ] Other: _______________
- [ ] TBD - need to research

**Q35:** KYC verification levels required for recipients:
- [ ] Basic identity verification
- [ ] Government ID verification
- [ ] Proof of address
- [ ] Enhanced due diligence for high-value payouts
- Threshold for enhanced: > ______ USDC

**Q36:** KYC data retention:
- Store on-chain: [ ] Hash only [ ] Encrypted attestation [ ] Nothing
- Store off-chain: [ ] Full data [ ] Attestation only [ ] Nothing
- Retention period: ______ months/years

**Q37:** Jurisdictional restrictions:
- Block specific countries? [ ] YES [ ] NO
- If YES, blocked countries: _______________
- Reason: [ ] Legal compliance [ ] Sanctions [ ] Other: _______________

### 3.2 Compliance Features
**Q38:** Transaction limits without additional verification:
- Per transaction: ______ USDC
- Per day: ______ USDC
- Per month: ______ USDC
- [ ] No limits

**Q39:** Required recipient information before payout:
- [ ] Full legal name
- [ ] Email address
- [ ] Wallet address (obviously required)
- [ ] Tax ID / SSN (for tax reporting)
- [ ] Business registration (if applicable)
- [ ] Other: _______________

**Q40:** Tax reporting:
- Generate 1099 forms (US)? [ ] YES [ ] NO [ ] Future version
- Generate other tax documents? _______________
- Reporting threshold: > ______ USDC annually

---

## SECTION 4: INDEXER & DATA LAYER

### 4.1 Database Choice
**Q41:** Indexer database:
- [ ] PostgreSQL (recommended for complex queries)
- [ ] MongoDB (flexible schema)
- [ ] TimescaleDB (time-series optimized)
- [ ] Other: _______________

**Q42:** Database hosting:
- [ ] Self-hosted
- [ ] Managed service (AWS RDS, Google Cloud SQL, etc.)
- [ ] Decentralized (e.g., Ceramic, Tableland)

### 4.2 Event Sourcing
**Q43:** Event retention policy:
- [ ] Keep all events forever (full auditability)
- [ ] Archive old events after ______ months
- [ ] Never delete events but compress after ______ months

**Q44:** Event replay capability:
- [ ] Must support full replay from genesis (recommended)
- [ ] Only support replay from checkpoint
- Checkpoint frequency: Every ______ days/blocks

### 4.3 Caching Strategy
**Q45:** Cache layer:
- [ ] Redis (recommended)
- [ ] Memcached
- [ ] In-memory only
- [ ] No caching for v0

**Q46:** Cache TTL for different data:
- Campaign listings: ______ seconds
- Task details: ______ seconds
- Trending/discovery: ______ seconds
- User profiles: ______ seconds

---

## SECTION 5: API DESIGN

### 5.1 API Technology
**Q47:** API framework:
- [ ] Express.js (Node.js)
- [ ] Fastify (Node.js, faster)
- [ ] NestJS (TypeScript, structured)
- [ ] Actix-web (Rust, high performance)
- [ ] Other: _______________

**Q48:** API versioning:
- [ ] URL versioning (/v1/campaigns)
- [ ] Header versioning
- [ ] No versioning for v0

### 5.2 Rate Limiting
**Q49:** API rate limits:
- Anonymous users: ______ requests per minute
- Authenticated users: ______ requests per minute
- Per endpoint overrides needed? [ ] YES [ ] NO
- If YES, specify: _______________

### 5.3 Pagination
**Q50:** Default page size for listings:
- ______ items (suggest: 20-50)

**Q51:** Maximum page size:
- ______ items (suggest: 100)

### 5.4 Real-time Updates
**Q52:** Real-time event streaming:
- [ ] WebSocket support
- [ ] Server-Sent Events (SSE)
- [ ] Polling only
- [ ] Not needed for v0

**Q53:** If real-time updates, what events to stream:
- [ ] New campaigns
- [ ] New tasks
- [ ] Contributions
- [ ] Budget finalized
- [ ] Proof submitted
- [ ] Payout executed
- [ ] All events

---

## SECTION 6: DISCOVERY & RANKING

### 6.1 Ranking Algorithms
**Q54:** "Trending" algorithm parameters:
- Time window: Last ______ hours/days
- Weighting factors (total should = 100%):
  - Contribution velocity: ______%
  - Unique contributors: ______%
  - Recent views: ______%
  - Other (specify): ______%

**Q55:** "Top" ranking based on:
- [ ] Total funds raised
- [ ] Number of contributors
- [ ] Number of completed tasks
- [ ] Weighted score (specify formula): _______________

**Q56:** "Near goal" definition:
- Show tasks that are ______% to ______% funded

**Q57:** Anti-gaming measures:
- Minimum contribution to count as unique contributor: ______ USDC
- Time decay factor for trending: _______________
- Detect/flag suspicious patterns: [ ] YES [ ] NO
- If YES, specify patterns: _______________

### 6.2 Search Functionality
**Q58:** Search implementation:
- [ ] Elasticsearch (powerful, resource-intensive)
- [ ] PostgreSQL full-text search (simpler)
- [ ] Algolia (managed, fast)
- [ ] MeiliSearch (open-source, fast)
- [ ] Other: _______________

**Q59:** Searchable fields:
- [ ] Campaign title
- [ ] Campaign description
- [ ] Task title
- [ ] Task deliverables
- [ ] Creator wallet/username
- [ ] Tags/categories

**Q60:** Search features:
- [ ] Fuzzy matching
- [ ] Autocomplete
- [ ] Filters (category, funding range, date)
- [ ] Sorting options

### 6.3 Categories & Tags
**Q61:** Predefined campaign categories:
- [ ] Use categories
- [ ] Use free-form tags
- [ ] Use both

**Q62:** If using categories, list them:
1. _______________
2. _______________
3. _______________
4. _______________
5. _______________
(Add more as needed)

**Q63:** Category/tag limitations:
- Max categories per campaign: ______
- Max tags per campaign: ______
- Who can add categories: [ ] Creator only [ ] Community [ ] Both

---

## SECTION 7: WEB FRONTEND

### 7.1 Technology Stack
**Q64:** Frontend framework:
- [ ] Next.js (React, recommended)
- [ ] Remix (React)
- [ ] SvelteKit
- [ ] Nuxt (Vue)
- [ ] Other: _______________

**Q65:** Styling approach:
- [ ] Tailwind CSS
- [ ] Styled Components
- [ ] CSS Modules
- [ ] Material-UI
- [ ] Chakra UI
- [ ] Other: _______________

**Q66:** UI component library (if any):
- [ ] shadcn/ui
- [ ] Ant Design
- [ ] Material-UI
- [ ] Build custom components
- [ ] Other: _______________

### 7.2 Wallet Integration
**Q67:** Supported Solana wallets:
- [ ] Phantom
- [ ] Solflare
- [ ] Backpack
- [ ] Glow
- [ ] All via wallet-adapter (recommended)

**Q68:** Wallet connection flow:
- [ ] Connect on landing (required for browsing)
- [ ] Connect only when needed (better UX)

### 7.3 User Experience
**Q69:** User profiles/accounts:
- [ ] Wallet-only (no separate accounts)
- [ ] Optional username/profile creation
- [ ] Required profile setup
- If profiles, stored: [ ] On-chain [ ] Off-chain [ ] Hybrid

**Q70:** Campaign creation flow:
- [ ] Single-page form
- [ ] Multi-step wizard (recommended)
- Number of steps: ______
- Draft save feature: [ ] YES [ ] NO

**Q71:** Media uploads:
- Support for campaign images: [ ] YES [ ] NO
- Support for videos: [ ] YES [ ] NO
- Support for documents: [ ] YES [ ] NO
- Storage solution:
  - [ ] IPFS
  - [ ] Arweave
  - [ ] AWS S3
  - [ ] Cloudinary
  - [ ] Other: _______________
- Max file size: ______ MB

**Q72:** Notifications:
- [ ] Email notifications
- [ ] In-app notifications
- [ ] Browser push notifications
- [ ] None for v0

**Q73:** If notifications, notify users about:
- [ ] Campaign updates
- [ ] Task milestones
- [ ] Budget finalized
- [ ] Proof submitted (if donor)
- [ ] Payout executed
- [ ] Refund available
- [ ] Other: _______________

### 7.4 Analytics & Insights
**Q74:** Campaign analytics for creators:
- [ ] Contribution graph over time
- [ ] Donor demographics
- [ ] Traffic sources
- [ ] Task completion rate
- [ ] None for v0

**Q75:** Public campaign statistics:
- [ ] Total raised
- [ ] Number of backers
- [ ] Average contribution
- [ ] Funding velocity
- [ ] All of above
- [ ] Minimal (just total raised)

---

## SECTION 8: SECURITY & RISK MANAGEMENT

### 8.1 Program Security
**Q76:** Security audit plan:
- [ ] Professional audit required before mainnet
- [ ] Community audit/bug bounty
- [ ] Internal review only for v0
- Audit budget: ______ USD
- Preferred auditors: _______________

**Q77:** Bug bounty program:
- [ ] YES - Set up from launch
- [ ] YES - After audit
- [ ] NO - Not for v0
- If YES, max payout: ______ USD

**Q78:** Emergency controls:
- [ ] Circuit breaker (pause all operations)
- [ ] Per-program pause capability
- [ ] No emergency controls (most decentralized)
- If pause controls, who can trigger: _______________

### 8.2 Fraud Prevention
**Q79:** Mechanisms to prevent fraudulent campaigns:
- [ ] Manual review before publish
- [ ] Community flagging system
- [ ] Automated content moderation
- [ ] Stake requirement for creators
- [ ] Reputation-based limits
- [ ] None for v0

**Q80:** If stake requirement, amount:
- ______ USDC to create campaign
- Stake returned when: _______________
- Stake slashed if: _______________

**Q81:** Content moderation:
- [ ] Pre-moderation (review before publish)
- [ ] Post-moderation (review after publish)
- [ ] Reactive (only on reports)
- Moderation team: [ ] Internal [ ] Community [ ] DAO [ ] Third-party

**Q82:** Prohibited campaign types:
- [ ] Political campaigns
- [ ] Religious campaigns
- [ ] Adult content
- [ ] Gambling
- [ ] Weapons
- [ ] Pharmaceuticals
- [ ] Other: _______________

### 8.3 Smart Contract Risk
**Q83:** Invariant properties to enforce (will be tested):
List critical invariants:
1. _______________
2. _______________
3. _______________
4. _______________
5. _______________

**Q84:** Fuzzing and property-based testing:
- [ ] Required before mainnet
- [ ] Nice to have
- [ ] Not for v0

---

## SECTION 9: OPERATIONS & DEVOPS

### 9.1 Infrastructure
**Q85:** Hosting solution:
- [ ] AWS
- [ ] Google Cloud Platform
- [ ] Azure
- [ ] DigitalOcean
- [ ] Vercel (for web)
- [ ] Self-hosted
- [ ] Other: _______________

**Q86:** Infrastructure as Code:
- [ ] Terraform
- [ ] Pulumi
- [ ] CloudFormation
- [ ] Kubernetes manifests
- [ ] Docker Compose (for dev)
- [ ] None for v0

**Q87:** Container orchestration:
- [ ] Kubernetes
- [ ] Docker Swarm
- [ ] ECS/Fargate
- [ ] None (single server)

### 9.2 Monitoring & Observability
**Q88:** Monitoring tools:
- [ ] Prometheus + Grafana
- [ ] Datadog
- [ ] New Relic
- [ ] CloudWatch
- [ ] Other: _______________

**Q89:** Alert channels:
- [ ] Email
- [ ] Slack
- [ ] PagerDuty
- [ ] Discord
- [ ] Other: _______________

**Q90:** Critical metrics to monitor:
- [ ] Indexer sync lag
- [ ] RPC node health
- [ ] API error rate
- [ ] API latency (p50, p95, p99)
- [ ] Database connection pool
- [ ] Transaction confirmation rate
- [ ] All of above

**Q91:** Log aggregation:
- [ ] ELK Stack (Elasticsearch, Logstash, Kibana)
- [ ] Loki + Grafana
- [ ] CloudWatch Logs
- [ ] Datadog
- [ ] Other: _______________

### 9.3 CI/CD
**Q92:** CI/CD platform:
- [ ] GitHub Actions
- [ ] GitLab CI
- [ ] CircleCI
- [ ] Jenkins
- [ ] Other: _______________

**Q93:** Deployment strategy:
- [ ] Blue-green deployment
- [ ] Rolling deployment
- [ ] Canary deployment
- [ ] Direct deployment (for v0)

**Q94:** Testing requirements before deploy:
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual QA approval
- [ ] Performance benchmarks met
- [ ] Security scan pass

### 9.4 RPC Infrastructure
**Q95:** Solana RPC provider:
- [ ] Public Solana RPC (rate-limited, free)
- [ ] QuickNode
- [ ] Alchemy
- [ ] Helius
- [ ] Triton
- [ ] Self-hosted validator
- [ ] Multiple providers (fallback)

**Q96:** RPC reliability strategy:
- [ ] Single provider
- [ ] Primary + fallback
- [ ] Load balance across multiple
- Timeout before fallback: ______ seconds

---

## SECTION 10: DATA GOVERNANCE & PRIVACY

### 10.1 Data Storage
**Q97:** What data is stored on-chain vs off-chain:

**ON-CHAIN:**
- [ ] Campaign ID and basic metadata
- [ ] Task ID and basic metadata
- [ ] Contribution amounts and wallet addresses
- [ ] Budget votes
- [ ] Proof hashes
- [ ] Payout records
- [ ] Refund records
- [ ] KYC attestation hashes
- [ ] Other: _______________

**OFF-CHAIN:**
- [ ] Full campaign descriptions
- [ ] Media files
- [ ] User profiles
- [ ] Search indexes
- [ ] Analytics data
- [ ] KYC full data (with provider)
- [ ] Other: _______________

**Q98:** PII handling:
- [ ] Never store PII
- [ ] Store PII encrypted
- [ ] Store PII hashed
- [ ] Store PII with third-party only
- Data encryption at rest: [ ] YES [ ] NO
- Data encryption in transit: [ ] YES [ ] NO (must be YES)

**Q99:** GDPR/Privacy compliance:
- [ ] Support right to erasure (delete account)
- [ ] Support data export
- [ ] Cookie consent
- [ ] Privacy policy required
- [ ] Not applicable (no EU users)

### 10.2 Data Retention
**Q100:** User data retention after account deletion:
- [ ] Delete immediately
- [ ] Anonymize and retain for analytics
- [ ] Retain for ______ months for legal compliance
- [ ] Cannot delete (all on-chain)

---

## SECTION 11: TOKENOMICS & INCENTIVES (Future)

**Q101:** Does v0 need a native governance/utility token?
- [ ] YES - Describe use case: _______________
- [ ] NO - Pure USDC protocol (RECOMMENDED)
- [ ] Future consideration

**Q102:** If future token, potential use cases:
- [ ] Governance voting
- [ ] Staking for reviewers
- [ ] Reputation/credibility
- [ ] Platform fee discounts
- [ ] Other: _______________

---

## SECTION 12: BUSINESS & OPERATIONAL

### 12.1 Revenue Model
**Q103:** How will the platform sustain itself?
- [ ] No revenue model - pure public good
- [ ] Optional platform fees
- [ ] Grants and donations
- [ ] DAO treasury management
- [ ] Future revenue streams (specify): _______________

**Q104:** Legal entity:
- [ ] Not incorporated (protocol only)
- [ ] Non-profit foundation
- [ ] For-profit company
- [ ] DAO with legal wrapper
- [ ] TBD

### 12.2 Community & Governance
**Q105:** Decision-making for protocol changes:
- [ ] Core team decides
- [ ] Multisig vote
- [ ] Token holder governance (if token exists)
- [ ] Community snapshot voting
- [ ] Other: _______________

**Q106:** Public roadmap:
- [ ] YES - Fully transparent
- [ ] YES - High-level only
- [ ] NO - Keep internal

---

## SECTION 13: LAUNCH STRATEGY

### 13.1 MVP Scope
**Q107:** Must-have features for v0 launch:
Rank in priority (1 = must have, 2 = should have, 3 = nice to have)

- __ Campaign creation
- __ Task creation
- __ Contributions with USDC
- __ Budget voting
- __ Proof submission
- __ Approval mechanism (whichever model chosen)
- __ Payouts
- __ Refunds
- __ Discovery/browse
- __ Search
- __ User profiles
- __ KYC integration
- __ Dispute resolution
- __ Mobile responsive web
- __ Email notifications

**Q108:** Features to defer to v1+:
- _______________
- _______________
- _______________

### 13.2 Testing & Launch
**Q109:** Beta testing plan:
- [ ] Closed alpha (internal team)
- [ ] Open beta (public, devnet)
- [ ] Invite-only beta
- Duration: ______ weeks
- Target number of test users: ______

**Q110:** Launch approach:
- [ ] Full public launch
- [ ] Invite-only launch
- [ ] Gradual rollout (waitlist)
- [ ] Soft launch with marketing later

**Q111:** Initial supply caps for risk management:
- Max TVL during first month: ______ USDC
- Max per campaign: ______ USDC
- Max per task: ______ USDC
- [ ] No caps (riskier)

---

## SECTION 14: DOCUMENTATION & SUPPORT

**Q112:** User documentation needed:
- [ ] Getting started guide
- [ ] How to create campaign
- [ ] How to contribute
- [ ] How to submit proof
- [ ] FAQ
- [ ] Video tutorials
- [ ] API documentation
- [ ] Smart contract documentation

**Q113:** Developer documentation:
- [ ] Program IDL reference
- [ ] API reference
- [ ] Integration guide
- [ ] SDK (if building one)
- [ ] Example projects

**Q114:** Support channels:
- [ ] Discord community
- [ ] Help desk / ticketing
- [ ] Email support
- [ ] Community forum
- [ ] Twitter/X
- [ ] In-app chat

---

## SECTION 15: SPECIAL REQUIREMENTS

**Q115:** Any specific regulatory requirements you're aware of:
- _______________

**Q116:** Any specific user groups or use cases to prioritize:
- _______________

**Q117:** Any integrations with other protocols/platforms:
- _______________

**Q118:** Any unique features not covered in the docs:
- _______________

**Q119:** Budget constraints:
- Development budget: ______ USD
- Infrastructure budget (monthly): ______ USD
- Audit budget: ______ USD
- Marketing budget: ______ USD

**Q120:** Timeline expectations:
- Target v0 launch date: _______________
- Hard deadline (if any): _______________
- Preferred development pace: [ ] Fast [ ] Steady [ ] Careful

---

## SECTION 16: YOUR PRIORITIES

**Q121:** Rank these priorities (1 = highest, 5 = lowest):
- __ Security and auditability
- __ User experience
- __ Decentralization
- __ Speed to market
- __ Feature completeness

**Q122:** What success looks like for v0:
- _______________

**Q123:** Biggest risks you're concerned about:
- _______________

**Q124:** Any other context, requirements, or preferences:
- _______________

---

# FINAL CHECKLIST

Before submitting, ensure you've answered:
- [ ] All SECTION 1 questions (CRITICAL - scope decisions)
- [ ] All questions marked as "Choose ONE" or "MUST"
- [ ] Technical stack preferences (Sections 2-7)
- [ ] Security requirements (Section 8)
- [ ] Operational requirements (Section 9)
- [ ] Launch strategy (Section 13)

**Once completed, save this file and provide it back. I will use your answers to build the complete v0 implementation.**
