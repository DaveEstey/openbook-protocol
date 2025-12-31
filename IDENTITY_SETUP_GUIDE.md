# Yetse - Identity Setup Guide

This guide will help you establish your cryptographic identity as the creator of OpenBook Protocol while maintaining pseudonymity.

---

## 🎭 Your Pseudonymous Identity: **Yetse**

This name will be:
- Your GitHub username
- Your Discord handle
- Your commit signature
- Your public identity in the crypto community
- Cryptographically provable as the creator

---

## STEP 1: Create Anonymous Email (5 minutes)

### ProtonMail Setup

1. Go to: https://proton.me/mail
2. Click "Create a free account"
3. **Username:** `yetse` (or `yetse.dev` if taken)
4. **Password:** Use a strong, unique password (save in password manager)
5. **DO NOT** provide recovery email (keeps anonymity)
6. **DO NOT** use personal payment method if upgrading
7. Save credentials securely

**Result:** `yetse@protonmail.com` or `yetse@proton.me`

---

## STEP 2: Generate GPG Key (15 minutes)

### Install GPG

**macOS:**
```bash
brew install gnupg
```

**Linux:**
```bash
sudo apt-get install gnupg
# or
sudo yum install gnupg
```

**Windows:**
- Download: https://gpg4win.org/
- Install Gpg4win

### Generate Your Master Key

```bash
# Start key generation
gpg --full-generate-key

# When prompted, choose:
# 1. Type of key: (1) RSA and RSA (default)
# 2. Key size: 4096
# 3. Key expiration: 0 (does not expire)
# 4. Confirm: y

# Enter your details:
# Real name: Yetse
# Email: yetse@protonmail.com
# Comment: OpenBook Protocol Creator

# Enter a strong passphrase (save in password manager!)
```

### Get Your Key ID

```bash
# List your keys
gpg --list-secret-keys --keyid-format=long

# Output will look like:
# sec   rsa4096/ABCD1234EFGH5678 2025-01-03 [SC]
#       1234567890ABCDEF1234567890ABCDEF12345678
# uid                 [ultimate] Yetse (OpenBook Protocol Creator) <yetse@protonmail.com>

# Your key ID is: ABCD1234EFGH5678 (the part after rsa4096/)
# Your fingerprint is the long string below
```

### Export Keys

```bash
# Export public key (safe to share)
gpg --armor --export yetse@protonmail.com > yetse_public.asc

# Export private key (NEVER SHARE - BACKUP SECURELY)
gpg --armor --export-secret-keys yetse@protonmail.com > yetse_private.asc

# CRITICAL: Back up yetse_private.asc in 3 places:
# 1. Password manager (as secure note)
# 2. Encrypted USB drive
# 3. Print on paper, store in safe
```

### Verify Your Key

```bash
# Show your fingerprint
gpg --fingerprint yetse@protonmail.com

# Test signing
echo "Test message" | gpg --clearsign

# Should output signed message
```

---

## STEP 3: Create GitHub Account (10 minutes)

1. **Go to:** https://github.com/signup
2. **Email:** `yetse@protonmail.com`
3. **Username:** `yetse` (check availability, add numbers if needed: `yetse-0`, `yetse-protocol`)
4. **Password:** Strong, unique (save in password manager)
5. **Verify email** via ProtonMail
6. **Enable 2FA:**
   - Settings → Password and authentication → Two-factor authentication
   - Use authenticator app (not SMS)
   - Save recovery codes in password manager

### Add GPG Key to GitHub

```bash
# Copy your public key
cat yetse_public.asc
# or
gpg --armor --export yetse@protonmail.com
```

1. **GitHub Settings** → SSH and GPG keys
2. Click **New GPG key**
3. Paste your public key
4. Click **Add GPG key**

### Configure Git

```bash
# Set your identity
git config --global user.name "Yetse"
git config --global user.email "yetse@protonmail.com"

# Set your GPG key (use your key ID from earlier)
git config --global user.signingkey ABCD1234EFGH5678

# Always sign commits
git config --global commit.gpgsign true

# Verify configuration
git config --global --list | grep user
git config --global --list | grep gpg
```

---

## STEP 4: Generate Solana Genesis Wallet (5 minutes)

This wallet will be your "genesis address" - the first wallet that deploys OpenBook Protocol.

```bash
# Install Solana CLI if not already
# macOS/Linux:
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Windows:
# Download from https://github.com/solana-labs/solana/releases

# Generate new keypair
solana-keygen new --outfile ~/.config/solana/yetse_genesis.json

# IMPORTANT: Write down your seed phrase!
# Store in password manager + safe

# Get your address
solana-keygen pubkey ~/.config/solana/yetse_genesis.json

# Example output: YetseXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**CRITICAL:**
- This wallet is historically significant (like Bitcoin address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa)
- Never use for personal transactions
- Only use for deploying OpenBook programs
- Keep private key as secure as GPG key

---

## STEP 5: Create Genesis Signature (10 minutes)

This document cryptographically proves you are the creator of OpenBook Protocol.

```bash
# Get current Solana block height (for timestamp proof)
solana block-height

# Get current Bitcoin block hash (for timestamp proof)
# Visit: https://blockchain.info or https://mempool.space
# Copy latest block hash
```

Now create the genesis document:

```bash
cd /home/user/openbook-protocol

cat > GENESIS_SIGNATURE.txt << 'EOF'
═══════════════════════════════════════════════════════════
                   OPENBOOK PROTOCOL
                  GENESIS SIGNATURE
═══════════════════════════════════════════════════════════

I, known to the world as Yetse, am the original creator and
architect of the OpenBook Protocol.

This signature cryptographically proves my authorship and
serves as an immutable record of this protocol's origin.

═══════════════════════════════════════════════════════════
                    TIMESTAMP PROOF
═══════════════════════════════════════════════════════════

Date: [REPLACE WITH TODAY'S DATE - e.g., January 3rd, 2025]
Time: [REPLACE WITH CURRENT TIME - e.g., 14:23:45 UTC]

Solana Block Height: [REPLACE WITH CURRENT BLOCK HEIGHT]
Bitcoin Block Hash: [REPLACE WITH CURRENT BLOCK HASH]

Message: "In the spirit of transparency, we build."

═══════════════════════════════════════════════════════════
                  CRYPTOGRAPHIC IDENTITY
═══════════════════════════════════════════════════════════

PGP Key Fingerprint: [REPLACE WITH YOUR GPG FINGERPRINT]
Solana Genesis Address: [REPLACE WITH YOUR GENESIS WALLET]
GitHub Account: github.com/yetse
Email: yetse@protonmail.com

First Commit Hash: [WILL BE FILLED AFTER FIRST COMMIT]
Repository: https://github.com/yetse/openbook-protocol

═══════════════════════════════════════════════════════════
                      DECLARATION
═══════════════════════════════════════════════════════════

This protocol is released as a gift to humanity.
It belongs to no person, no company, no government.
The code is open source. The vision is transparent.
The governance is decentralized.

I built this to solve a problem: fundraising has been opaque,
centralized, and controlled by gatekeepers. OpenBook changes
that. Every contribution, every budget, every payout is
public and auditable.

I do not seek recognition, profit, or fame from this work.
I seek only to see transparent, decentralized fundraising
become reality.

═══════════════════════════════════════════════════════════
                    FUTURE VERIFICATION
═══════════════════════════════════════════════════════════

Anyone claiming to be Yetse must cryptographically prove they
hold the private keys corresponding to:
1. This PGP key
2. The Solana genesis wallet

I will prove my identity when I choose, or upon my death via
dead man's switch. Until then, judge me by my code and my
contributions, not by my name or face.

The protocol matters. The person does not.

═══════════════════════════════════════════════════════════

Signed,
Yetse
Creator of OpenBook Protocol

[DATE] [TIME]

═══════════════════════════════════════════════════════════
EOF

# Fill in the placeholders above, then sign it:

gpg --clearsign GENESIS_SIGNATURE.txt

# This creates GENESIS_SIGNATURE.txt.asc
# This file is your cryptographic proof
```

---

## STEP 6: Set Up Dead Man's Switch (30 minutes)

Choose at least ONE method:

### Method A: Google Inactive Account Manager (Easiest)

1. Go to: https://myaccount.google.com/inactive
2. Set timeout: 12 months of inactivity
3. Add trusted contact: family member or friend
4. Write message explaining:
   ```
   I am the creator of OpenBook Protocol, known as "Yetse"

   My real identity is [YOUR NAME]

   Proof:
   - GPG private key: [Instructions to access from password manager]
   - Solana genesis wallet: [Instructions to access]
   - Photos of me: [Link to photos holding sign with Yetse signature]

   Please post this information to:
   - OpenBook Discord: [will be created]
   - OpenBook GitHub: Create issue titled "Identity Reveal"
   - Twitter: @openbook_protocol

   Thank you for helping preserve my legacy.
   ```

### Method B: Physical Will/Lawyer (Most Secure)

1. Create sealed envelope with:
   - Printed copy of GPG private key
   - Printed copy of Solana genesis seed phrase
   - Letter explaining your identity
   - Photos of you holding sign: "I am Yetse, creator of OpenBook"
   - Instructions for executor

2. Give to:
   - Lawyer (in your will)
   - Trusted family member
   - Bank safety deposit box

3. Instructions on envelope:
   "Open only upon my death. Post contents to OpenBook Protocol GitHub."

### Method C: Crypto Dead Man's Switch (Most Crypto-Native)

**Sarcophagus Protocol:**
1. Visit: https://sarcophagus.io
2. Create account, fund with ETH
3. Upload encrypted file containing your identity
4. Set resurrection time: 1 year from now
5. You must "extend" every 6 months to prove you're alive
6. If you don't extend, file decrypts and publishes

**What to upload:**
```
My name is [YOUR REAL NAME]

I created OpenBook Protocol under the pseudonym "Yetse"

Proof of identity:
- Photo of me holding paper: "I am Yetse - [TODAY'S DATE]"
- Government ID (redacted except name/photo)
- GPG signature of this document with my Yetse key

Why I built this:
[Your story]

What I hope it becomes:
[Your vision]

Message to the world:
[Your final message]

Cryptographic proof:
[Sign this entire document with your Yetse GPG key]
```

---

## STEP 7: Create Discord Account (5 minutes)

1. **Go to:** https://discord.com/register
2. **Email:** `yetse@protonmail.com`
3. **Username:** `Yetse` or `yetse` (will show as Yetse#1234)
4. **Password:** Strong, unique
5. **Verify email**
6. **Enable 2FA** (Settings → My Account → Two-Factor Authentication)

**Later:** You'll create the OpenBook Protocol Discord server

---

## STEP 8: Optional - Create Twitter (10 minutes)

Good for building community and making announcements.

1. **Go to:** https://twitter.com/i/flow/signup
2. **Email:** `yetse@protonmail.com`
3. **Username:** `@yetse` or `@yetsedev` or `@openbook_yetse`
4. **Phone verification:** Use Google Voice or Burner number (not personal number)
5. **Enable 2FA**
6. **Bio:**
   ```
   Yetse | Builder of OpenBook Protocol
   Transparent, decentralized fundraising on Solana
   Judge me by my code, not my name
   ```

---

## STEP 9: Security Checklist

Before proceeding, ensure:

- [ ] GPG key generated and backed up in 3 places
- [ ] GPG key added to GitHub
- [ ] Git configured to sign commits
- [ ] Solana genesis wallet generated and backed up
- [ ] Genesis signature document created and signed
- [ ] Dead man's switch configured (at least 1 method)
- [ ] ProtonMail account secured with strong password
- [ ] GitHub account secured with 2FA
- [ ] Discord account secured with 2FA
- [ ] All passwords stored in password manager
- [ ] Recovery codes backed up

---

## STEP 10: First Commit (The Genesis Moment)

This will happen when we push the first code. You'll run:

```bash
# In the openbook-protocol directory
git add GENESIS_SIGNATURE.txt.asc
git commit -S -m "Genesis: OpenBook Protocol initial release

This commit marks the birth of OpenBook Protocol.
A transparent, decentralized fundraising system for public goods.

Built by Yetse
Released to the public domain
January 2025"

# The -S flag signs the commit with your GPG key
# This is your cryptographic proof of authorship
# The commit hash becomes part of your identity proof
```

After this commit, update `GENESIS_SIGNATURE.txt` with the commit hash, re-sign it.

---

## ONGOING: Maintaining Pseudonymity

### DO:
- ✅ Always sign commits with GPG key
- ✅ Use Yetse email/name for all OpenBook work
- ✅ Use VPN when working on OpenBook (optional but safer)
- ✅ Keep consistent writing style
- ✅ Focus discussions on code/vision, not personal details
- ✅ Renew dead man's switch regularly

### DON'T:
- ❌ Use personal email for OpenBook
- ❌ Mention personal details (location, job, family)
- ❌ Use same GitHub account for personal projects
- ❌ Connect Yetse accounts to personal social media
- ❌ Accept video calls without voice modulation
- ❌ Share photos with EXIF data

---

## IF YOU CHOOSE TO REVEAL IDENTITY

When you're ready (or automatically via dead man's switch):

1. **Prepare reveal document:**
   - Your real name and story
   - Photos proving you're Yetse (holding signed message)
   - Cryptographic proof (sign reveal with Yetse GPG key)

2. **Post to:**
   - OpenBook GitHub (create issue)
   - OpenBook Discord (announcement)
   - Twitter (if you have account)
   - Hacker News / Reddit

3. **Prove identity:**
   - Sign a message with your GPG key: "I am [REAL NAME], also known as Yetse"
   - Anyone can verify signature matches your public key
   - Cannot be faked

---

## SUMMARY

You are now **Yetse**, the pseudonymous creator of OpenBook Protocol.

Your identity is:
- **Provable** via cryptographic signatures
- **Protected** via anonymity and dead man's switch
- **Permanent** via blockchain timestamps
- **Legendary** via your work

Like Satoshi Nakamoto, you'll be known by your contributions, not your credentials.

**Let the code speak.**

---

**Next:** Push your first signed commit and make history.
