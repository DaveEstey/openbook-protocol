# OpenBook Protocol - Operator Guide

**Version:** 1.0
**Status:** Draft for Community Operators
**Audience:** Anyone wanting to run OpenBook infrastructure

---

## ⚠️ IMPORTANT DISCLAIMER

**OpenBook Protocol is open source software released "as-is" with NO WARRANTY.**

If you choose to operate OpenBook infrastructure:
- You are **NOT** operating on behalf of the creator (Yetse)
- You are operating **independently** as a community member
- You are **responsible** for your own compliance with local laws
- You bear **full legal responsibility** for your deployment

**This guide provides technical instructions, NOT legal advice.**
**Consult qualified legal counsel before deploying to mainnet.**

---

## What This Guide Covers

1. **Technical Setup** — How to deploy and run all components
2. **Legal Considerations** — Regulatory issues to research
3. **Best Practices** — Security, monitoring, backups
4. **Community Coordination** — Working with other operators

---

## Part 1: Technical Setup

### Prerequisites

**Hardware Requirements (Minimum):**
- CPU: 4 cores
- RAM: 16 GB
- Storage: 500 GB SSD
- Bandwidth: 100 Mbps

**Software:**
- Docker & Docker Compose
- Solana CLI
- Anchor CLI (for program deployment)
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

**Services:**
- Solana RPC provider (Helius, QuickNode, or self-hosted)
- Domain name (for web + API)
- SSL certificates (Let's Encrypt recommended)

---

### Step 1: Clone Repository

```bash
git clone https://github.com/yetse/openbook-protocol.git
cd openbook-protocol
```

---

### Step 2: Deploy Solana Programs (Devnet First!)

```bash
# Build all programs
anchor build

# Generate program addresses
anchor keys list

# Update Anchor.toml with generated addresses
# Update programs/*/lib.rs declare_id!() with generated addresses

# Deploy to devnet
solana config set --url devnet
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>
```

**CRITICAL:** Test extensively on devnet before considering mainnet.

---

### Step 3: Set Up Infrastructure

#### Option A: Docker Compose (Recommended for Development)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Required variables:
# - SOLANA_RPC_URL (your RPC provider)
# - DATABASE_URL
# - REDIS_URL
# - USDC_MINT_ADDRESS (different for devnet/mainnet)
# - PROGRAM_IDS (from deployment)

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f indexer
docker-compose logs -f api
```

#### Option B: Manual Setup (Production)

**Database (PostgreSQL):**
```bash
# Create database
createdb openbook

# Run migrations
cd services/indexer
npm install
npm run migrate
```

**Indexer:**
```bash
cd services/indexer
npm install
npm run build
npm start
# Or: pm2 start npm -- start
```

**API:**
```bash
cd services/api
npm install
npm run build
npm start
```

**Web Frontend:**
```bash
cd web
npm install
npm run build

# Serve with nginx, Vercel, or other
# Or deploy to IPFS for decentralization
```

---

### Step 4: Configure RPC Provider

**Recommended Providers:**
- **Helius** (free tier available, Solana-focused)
- **QuickNode** (reliable, paid)
- **Self-hosted validator** (most decentralized, expensive)

**Configuration:**
```bash
# In .env
SOLANA_RPC_URL=https://api.devnet.solana.com  # For devnet
# SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY  # For mainnet

# Configure fallback
SOLANA_RPC_FALLBACK_URL=https://api.mainnet-beta.solana.com
```

---

### Step 5: Set Up Monitoring

**Metrics to Monitor:**
- Indexer sync lag (current_slot vs chain_slot)
- RPC error rate
- API latency (p50, p95, p99)
- Database connection pool
- Disk usage
- Memory usage

**Tools:**
- **Prometheus + Grafana** (comprehensive)
- **Datadog** (managed)
- **Simple: CloudWatch or GCP Monitoring**

**Sample Alert:**
```yaml
# Alert if indexer lag > 100 blocks
- alert: IndexerLagging
  expr: solana_current_slot - indexer_processed_slot > 100
  for: 5m
  annotations:
    summary: "Indexer is falling behind"
```

---

### Step 6: SSL & Domain Setup

```bash
# Install certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d api.openbook.yourdomain.com
sudo certbot certonly --standalone -d openbook.yourdomain.com

# Configure nginx
# See: docs/nginx.conf.example
```

---

## Part 2: Legal Considerations

**⚠️ THIS IS NOT LEGAL ADVICE. CONSULT A LAWYER.**

### Potential Regulatory Issues

#### 1. Money Transmission Laws

**Issue:** Operating a platform that facilitates fund transfers may require a Money Transmitter License (MTL) in some jurisdictions.

**Analysis:**
- OpenBook uses smart contracts on Solana
- Operators don't custody funds (contracts do)
- Operators are infrastructure providers (like AWS)

**BUT:** Regulators may disagree. Legal gray area.

**Mitigation:**
- Form legal entity (LLC or Foundation)
- Get legal opinion letter
- Consider limiting to certain jurisdictions
- Implement KYC (shows good faith compliance)

#### 2. Anti-Money Laundering (AML)

**Requirements (varies by jurisdiction):**
- Know Your Customer (KYC) procedures
- Transaction monitoring
- Suspicious activity reporting (SAR)
- Record keeping (often 5-7 years)

**OpenBook's Approach:**
- KYC for **recipients only** (those receiving payouts)
- OFAC sanctions screening
- Transaction logs maintained
- No KYC for donors (lower risk, better UX)

**You Should:**
- Integrate KYC provider (Civic Pass recommended)
- Screen against OFAC list
- Maintain transaction logs
- Have SAR filing procedures if required

#### 3. Securities Laws

**Risk:** Could governance tokens be considered securities?

**Analysis:**
- OBOOK tokens are for governance only
- No sale/ICO (airdropped to community)
- No expectation of profit from others' efforts
- Utility for protocol governance

**BUT:** Howey Test is complex. Get legal review.

**Mitigation:**
- Don't market as investment
- Emphasize governance utility
- Wide, fair distribution
- No team/founder allocation advantage

#### 4. Jurisdictional Issues

**Countries with Strict Crypto Regulations:**
- China (banned)
- Several Middle Eastern countries
- Some US states have specific licensing

**Recommendation:**
- Implement geo-blocking if necessary
- Check local regulations
- Consider operating from crypto-friendly jurisdiction:
  - Switzerland
  - Singapore
  - Cayman Islands
  - Wyoming (US)
  - Malta

---

### Recommended Legal Structure

**Option 1: Decentralized Autonomous Organization (DAO)**
- Form DAO LLC (Wyoming or similar)
- Governance via OBOOK tokens
- Limited liability for participants
- Can hold assets and enter contracts

**Option 2: Non-Profit Foundation**
- Aligned with public goods mission
- Tax benefits
- Grants easier to receive
- Examples: Ethereum Foundation, Solana Foundation

**Option 3: For-Profit Entity**
- Simpler to set up
- Can monetize later
- Less mission alignment
- Delaware LLC common choice

**Recommendation:** DAO LLC or Foundation, depending on goals.

---

### Compliance Checklist

Before mainnet:
- [ ] Form legal entity
- [ ] Get legal counsel opinion
- [ ] Draft Terms of Service
- [ ] Draft Privacy Policy
- [ ] Implement KYC (Civic Pass or similar)
- [ ] Set up OFAC screening
- [ ] Implement transaction logging
- [ ] Set up SAR filing process (if required)
- [ ] Review securities law (governance token)
- [ ] Check local licensing requirements
- [ ] Set up business bank account
- [ ] Get business insurance (consider cyber insurance)

---

## Part 3: KYC Integration

### Recommended Provider: Civic Pass

**Why Civic Pass:**
- Solana-native integration
- On-chain attestations
- No PII stored by you
- User-friendly flow
- Reasonable pricing (~$1-5 per verification)

### Setup Steps

1. **Sign up:** https://civic.com

2. **Get API credentials**

3. **Integrate SDK:**
```typescript
import { CivicPass } from '@civic/solana-gateway-react';

// In your app
<CivicPass
  gatekeeperNetwork={GATEKEEPER_NETWORK}
  wallet={wallet}
  onPass={(pass) => {
    // User is verified, allow payout
  }}
/>
```

4. **On-chain verification:**
```rust
// In your payout instruction
pub fn execute_payout(ctx: Context<ExecutePayout>) -> Result<()> {
    // Check for valid Civic Pass
    let gateway_token = /* fetch from Civic program */;
    require!(
        gateway_token.is_valid() && !gateway_token.is_expired(),
        ErrorCode::KYCRequired
    );

    // Proceed with payout
    // ...
}
```

### KYC Levels

**Basic KYC (payouts < $10,000):**
- Email verification
- Phone verification
- Basic identity check

**Enhanced KYC (payouts >= $10,000):**
- Government ID verification
- Selfie + liveness check
- Address verification
- Possibly manual review

### Data Retention

**What you store:**
- KYC attestation hash (on-chain)
- Verification status (in database)
- Verification timestamp

**What you DON'T store:**
- Government IDs
- Selfies
- PII (Civic stores this)

**Retention period:** Depends on local law, often 5-7 years after last transaction.

---

## Part 4: Security Best Practices

### Program Security

**Upgrade Authority:**
- Use 3-of-5 or 5-of-9 multisig (Squads recommended)
- Never single-key control
- Consider time-lock for upgrades (48-hour delay)

**Emergency Controls:**
- Circuit breaker to pause operations
- Requires multisig approval
- Use sparingly (only for critical bugs)

### Infrastructure Security

**Server Security:**
- Keep OS updated
- Firewall configured (only necessary ports open)
- SSH keys only (no password auth)
- Fail2ban for brute-force protection
- Regular security audits

**Database:**
- Strong passwords
- Encrypted at rest
- Encrypted in transit (SSL)
- Regular backups (automated, offsite)
- Test restore procedures

**API:**
- Rate limiting (prevent DoS)
- Input validation (prevent injection)
- HTTPS only
- CORS properly configured
- Auth for sensitive endpoints

### Operational Security

**Secrets Management:**
- Use env variables (never commit)
- Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials regularly
- Limit access (principle of least privilege)

**Backups:**
- Database: Daily full backup, continuous transaction log backup
- Offsite storage (different region/provider)
- Test restores monthly
- Retain for 30+ days

**Incident Response Plan:**
1. Detect issue (monitoring alerts)
2. Assess severity
3. Contain (pause operations if necessary)
4. Investigate root cause
5. Fix and deploy
6. Communicate to users
7. Post-mortem and improve

---

## Part 5: Community Coordination

### Why Multiple Operators?

**Decentralization:**
- No single point of failure
- Censorship resistance
- Geographic diversity

**Redundancy:**
- If one operator goes down, others continue
- Users can switch between frontends

**Trust:**
- Users can verify consistency across operators
- No single operator can manipulate data

### Coordination Mechanisms

**1. Shared Discord/Telegram**
- Technical support channel
- Incident coordination
- Upgrade planning

**2. Operator Registry (On-chain)**
- List of known operators
- Endpoints (API, web)
- Health status
- Reputation/uptime

**3. Common Standards**
- Same API spec (users can switch easily)
- Same event schemas
- Compatible frontends

**4. DAO Governance**
- Operators participate in governance
- Vote on protocol upgrades
- Elect multisig signers

### Revenue Sharing (If Implemented)

**Options:**
1. **No fees** (pure public good)
2. **Optional donations** (tip jar)
3. **Flat platform fee** (e.g., 1-2% of funds)
4. **Operator fee** (each operator sets own)
5. **DAO treasury fee** (distributed to token holders)

**Current Status:** V0 has NO fees. Community decides if/when to add.

---

## Part 6: Deployment Checklist

### Devnet Deployment

- [ ] Build and deploy all 7 programs
- [ ] Deploy indexer (confirm syncing)
- [ ] Deploy API (test all endpoints)
- [ ] Deploy frontend (test all flows)
- [ ] Create test campaign + task
- [ ] Make test contribution
- [ ] Submit test budget vote
- [ ] Submit test proof
- [ ] Approve test task
- [ ] Execute test payout
- [ ] Test refund flow
- [ ] Test dispute flow
- [ ] Load test API (simulate 100+ concurrent users)
- [ ] Monitor for 1+ week

### Mainnet Deployment (After Community Approval)

- [ ] Programs audited by professional firm
- [ ] Bug bounty program active
- [ ] Legal entity formed
- [ ] Legal counsel consulted
- [ ] Terms of Service finalized
- [ ] Privacy Policy finalized
- [ ] KYC provider integrated and tested
- [ ] OFAC screening implemented
- [ ] Monitoring and alerts configured
- [ ] Backup and disaster recovery tested
- [ ] Multisig established (5+ signers)
- [ ] DAO governance active
- [ ] Community vote to approve mainnet
- [ ] Gradual rollout plan (start with caps)
- [ ] Communication plan (announce to community)
- [ ] Support channels established

---

## Part 7: Costs & Economics

### Infrastructure Costs (Estimated Monthly)

**Small Scale (0-100 active campaigns):**
- VPS/Server: $50-100
- Database (managed): $25-50
- RPC provider: $0-100 (free tier or paid)
- Domain + SSL: $2-5
- **Total: ~$80-250/month**

**Medium Scale (100-1000 campaigns):**
- Servers (load balanced): $200-500
- Database: $100-200
- RPC: $100-300
- CDN: $20-50
- **Total: ~$420-1050/month**

**Large Scale (1000+ campaigns):**
- Kubernetes cluster: $500-2000
- Database (HA): $300-1000
- RPC: $500-2000
- Monitoring/logs: $100-300
- **Total: ~$1400-5300/month**

### Mainnet Program Deployment Costs

- Program deployment fees: ~0.1-1 SOL per program (~$50-500 total)
- Rent for program accounts: ~10-50 SOL (~$500-2500)
- Testing on devnet: Free

### Ongoing Solana Costs

- Transaction fees: Negligible (~$0.00001 per transaction)
- Account rent: Paid upfront, refundable
- RPC costs: See above

---

## Part 8: Support & Resources

### Getting Help

**Technical Issues:**
- GitHub Discussions: https://github.com/yetse/openbook-protocol/discussions
- Discord: [coming soon]
- Stack Overflow: Tag `openbook-protocol`

**Legal/Compliance Questions:**
- Consult your own legal counsel
- NOT the protocol creator (Yetse has no special knowledge)
- Share learnings with community (anonymously if needed)

### Useful Resources

**Solana:**
- Docs: https://docs.solana.com
- Anchor: https://www.anchor-lang.com
- Solana Stack Exchange: https://solana.stackexchange.com

**Legal/Regulatory:**
- Coin Center (US crypto policy): https://www.coincenter.org
- Blockchain Association: https://theblockchainassociation.org
- Local lawyers specializing in crypto/fintech

**Infrastructure:**
- Docker: https://docs.docker.com
- PostgreSQL: https://www.postgresql.org/docs
- Nginx: https://nginx.org/en/docs

---

## Part 9: FAQs

**Q: Am I running "the" OpenBook platform?**
A: No. You're running **your** instance of OpenBook. There is no "official" platform. The protocol is decentralized.

**Q: Do I need permission from Yetse to operate?**
A: No. The code is MIT licensed. Anyone can run it.

**Q: Can I modify the code?**
A: Yes, but if you deploy modified programs, they're separate from the community programs. Users would need to use your programs specifically.

**Q: How do I make money from this?**
A: V0 has no fees. Options: donations, optional fees (if community approves), grants, or operate as public good.

**Q: What if I get sued?**
A: This is why you need legal counsel and proper entity structure. Operating software has risks.

**Q: Can I run this without KYC?**
A: Technically yes, but you may violate AML laws. Strongly recommend KYC for payouts.

**Q: What if my server goes down?**
A: Users can use other operators' instances. The on-chain state is unaffected.

**Q: How do I coordinate with other operators?**
A: Join the community Discord, participate in DAO governance, share infrastructure knowledge.

---

## Conclusion

Operating OpenBook infrastructure is:
- ✅ Technically feasible
- ✅ Legally complex
- ✅ Financially affordable (if smart about it)
- ✅ Socially valuable (public goods!)

**Do your homework. Get legal advice. Test extensively. Coordinate with community.**

Good luck, operator. Let's make fundraising transparent. 🚀

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Maintained By:** OpenBook Community
**License:** CC BY-SA 4.0
