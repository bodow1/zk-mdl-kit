# 🚨 SECURITY NOTICE

## Key Compromise - Action Required

**If you cloned this repository before [DATE], please read carefully!**

### What Happened

A private key file (`.reader-keys.json`) was accidentally committed to the public repository and has been exposed. While this is a **development/demo project** and the keys have **no real-world value**, it's a good learning opportunity about key management.

### Impact

- ⚠️ **Development keys only** - No production systems affected
- ⚠️ **Mock data** - All credentials in this project are for testing
- ⚠️ **No real mDLs** - This is a reference implementation

### What We Did

1. ✅ Removed `.reader-keys.json` from repository
2. ✅ Added key files to `.gitignore`
3. ✅ Updated documentation about key management
4. ✅ Added CI checks to prevent future commits
5. ✅ Added security guidelines

### What You Should Do

If you're using this project:

1. **Delete old key files:**
   ```bash
   rm -f .reader-keys.json .issuer-keys.json
   ```

2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

3. **Generate new keys:**
   ```bash
   # Keys will auto-generate on first run
   npm run start:verifier
   ```

4. **For production:** Use proper secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)

### Lessons Learned

This incident demonstrates why:

- ✅ **Never commit secrets** - Use `.gitignore` from day one
- ✅ **Use environment variables** - Not hardcoded values
- ✅ **Implement pre-commit hooks** - Catch secrets before commit
- ✅ **Use secrets scanning** - GitHub Advanced Security, GitGuardian, etc.
- ✅ **Rotate keys regularly** - Assume compromise, limit exposure

### Best Practices for Production

See [SECURITY.md](SECURITY.md) for comprehensive security guidelines including:

- Proper key management
- Secrets storage solutions
- Key rotation procedures
- Incident response plans

### Questions?

- Open a GitHub issue
- Email: security@example.com (update with your email)

---

**Last Updated:** [Current Date]  
**Severity:** Low (development keys only)  
**Status:** Resolved

