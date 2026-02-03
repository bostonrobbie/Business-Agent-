# UBOS Deployment Guide
**Universal Business Operating System - Setup and Operations**

---

## Quick Start

### 1. Install Dependencies

```bash
cd C:\Users\User\Documents\AI\OpenClaw\local-manus-agent-workspace\ai-company-os

# Install required packages
npm install node-cron
npm install axios
npm install express
npm install typescript
npm install tsx
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Run Demo (Test Everything)

```bash
npx tsx demo_ubos.ts
```

This will demonstrate:
- System initialization
- Financial guardrails
- Agent coordination
- Opportunity scanning
- Task management

### 4. Start UBOS (Production)

```bash
npx tsx start_ubos.ts
```

This starts the full system with:
- Automated daily cycles
- Scheduled opportunity scans
- Progress monitoring
- Telegram notifications

---

## Integration with Existing System

### Add API Endpoints

Edit `src/index.ts` to include UBOS endpoints:

```typescript
import ubosEndpoints from './api/ubos_endpoints';

// Add after existing routes
app.use('/api/ubos', ubosEndpoints);
```

### Update Dashboard

Edit `src/dashboard/index.html` to add UBOS section:

```javascript
// Add UBOS status panel
async function loadUBOSStatus() {
  const response = await fetch('http://localhost:3030/api/ubos/status');
  const data = await response.json();

  // Update dashboard with UBOS data
  document.getElementById('ubos-opportunities').innerText = data.status.opportunities;
  document.getElementById('ubos-tasks').innerText = data.status.active_tasks;
  // etc.
}

// Call every 5 seconds
setInterval(loadUBOSStatus, 5000);
```

---

## Automated Schedules

UBOS runs automatically on these schedules:

### Daily Operations

**7:00 AM - Morning Routine**
- System status report
- Top 3 opportunities
- Pending approvals alert

**9:00 AM, 2:00 PM, 7:00 PM - Opportunity Scans**
- Scan for new opportunities
- Alert on high-confidence finds (80%+)

**Every 4 Hours - Progress Checks**
- Check for blocked tasks
- Alert on pending approvals
- Monitor system health

**9:00 PM - Evening Summary**
- Daily activity report
- Tasks completed/pending
- Overnight status

### Weekly Operations

**Sunday 10:00 AM - Weekly Review**
- Week's accomplishments
- Approval rate
- Opportunities identified
- Next week preview

---

## Manual Commands

### Check System Status

```bash
# Via CLI
node dist/index.js status

# Via API
curl http://localhost:3030/api/ubos/status
```

### Run Opportunity Scan

```bash
# Via CLI
npx tsx -e "import {getUBOS} from './src/ubos'; getUBOS().getScanner().runDailyScan()"

# Via API
curl -X POST http://localhost:3030/api/ubos/opportunities/scan
```

### Create Task

```bash
# Via API
curl -X POST http://localhost:3030/api/ubos/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Research market","description":"Analyze AI trends","priority":"HIGH"}'
```

### Get Opportunities

```bash
# Via API
curl http://localhost:3030/api/ubos/opportunities?limit=10
```

### Get Detailed Report

```bash
# Via API
curl http://localhost:3030/api/ubos/opportunities/[opportunity_id]
```

---

## Telegram Interaction

You can interact with UBOS via Telegram (future enhancement):

```
/status - Get system status
/opportunities - List top opportunities
/tasks - Show active tasks
/approve [id] - Approve request
/deny [id] - Deny request
```

---

## Monitoring & Alerts

### What You'll Receive

**Morning (7:00 AM):**
```
🌅 GOOD MORNING - Daily UBOS Report

📊 SYSTEM STATUS:
- Active Tasks: 3
- Pending Tasks: 5
- Pending Approvals: 0

💡 TOP OPPORTUNITIES:
1. AI Trading Platform (85%)
   ROI: 300-500% annually
2. Opportunity Reports Service (90%)
   ROI: 200-400% annually
3. LinkedIn Automation (75%)
   ROI: 400-600% annually

🤖 UBOS is working autonomously today.
```

**High-Confidence Opportunity:**
```
💡 NEW HIGH-CONFIDENCE OPPORTUNITIES

1. [Opportunity Title]
   Confidence: 85%
   ROI: 300-500%
   Effort: medium

Reply "details 1" for full report.
```

**Blocked Task Alert:**
```
⚠️ ALERT: 2 task(s) blocked and need attention.
```

**Approval Request:**
```
⚠️ APPROVAL REQUIRED

Action: Subscribe to Market Data API
Cost: $99/month
Expected ROI: $500+/month

Approval ID: approval_1738525200_abc123

✅ "APPROVE" to proceed
❌ "DENY" to block
```

**Evening (9:00 PM):**
```
🌙 EVENING SUMMARY

📊 TODAY'S ACTIVITY:
- Tasks Completed: 8
- Tasks In Progress: 3
- Tasks Pending: 5

🤖 UBOS will continue working overnight.
Next update: Tomorrow morning at 7:00 AM
```

---

## File Structure

```
ai-company-os/
├── src/
│   ├── ubos.ts                    # Main UBOS class
│   ├── orchestration/
│   │   ├── master_coordinator.ts  # Task routing
│   │   └── types.ts               # Data types
│   ├── approval/
│   │   ├── financial_locks.ts     # Spending blocks
│   │   ├── decision_classifier.ts # Auto vs approval
│   │   └── approval_queue.ts      # Approval tracking
│   ├── intelligence/
│   │   └── opportunity_scanner.ts # Business opportunities
│   ├── api/
│   │   └── ubos_endpoints.ts      # REST API
│   └── automation/
│       └── daily_scheduler.ts     # Scheduled tasks
├── data/
│   ├── coordinator_state.json     # Tasks/agents/goals
│   ├── opportunities.json         # Opportunities
│   └── approval_queue.json        # Pending approvals
├── start_ubos.ts                  # Start production
├── demo_ubos.ts                   # Run demo
├── UBOS_README.md                 # Full documentation
├── BRIAN_ROEMMELE_RESEARCH.md     # Insights applied
└── UNIVERSAL_BUSINESS_OS_ARCHITECTURE.md # Design
```

---

## Troubleshooting

### UBOS Won't Start

```bash
# Check dependencies
npm install

# Build TypeScript
npm run build

# Check for errors
npx tsx start_ubos.ts
```

### No Telegram Notifications

1. Check bot token in `src/automation/daily_scheduler.ts`
2. Verify chat ID is correct
3. Test manual send:

```bash
curl -X POST "https://api.telegram.org/bot7509919329:AAEm5g4H7YYiUTkrQiRNdoJmMgM4PW5M4gA/sendMessage" \
  -d "chat_id=5791597360&text=Test"
```

### Opportunities Not Scanning

```bash
# Run manual scan
npx tsx -e "import {getUBOS} from './src/ubos'; (async()=>{const ubos=getUBOS(); await ubos.getScanner().runDailyScan();})()"
```

### Tasks Not Being Created

Check `data/coordinator_state.json` exists and is writable.

---

## Security Notes

### Financial Guardrails

**CRITICAL:** The financial locks are hard-coded in `src/approval/financial_locks.ts`.

DO NOT modify these without understanding the consequences:

```typescript
// These actions are PERMANENTLY BLOCKED
const FINANCIAL_ACTIONS = [
  'spend_money',
  'make_payment',
  'transfer_funds',
  // ... etc
];
```

**CFO Agent:** Enforced read-only in code:

```typescript
class CFOReadOnlyMode {
  static enforceReadOnly(action) {
    // Throws error if CFO attempts write operation
  }
}
```

### Audit Trail

All financial access attempts logged in:
- Console output
- `FinancialAuditLog` class
- Can be exported to file

---

## Performance Optimization

### For Large Operations

If UBOS becomes slow:

1. **Reduce Scan Frequency:**
   Edit `src/automation/daily_scheduler.ts`:
   ```typescript
   // Change from 3x daily to 1x daily
   const scanTask = cron.schedule('0 9 * * *', ...)
   ```

2. **Limit Opportunity Count:**
   ```typescript
   // In opportunity_scanner.ts
   return opportunities.slice(0, 10); // Keep only top 10
   ```

3. **Use Local LLM for Analysis:**
   ```typescript
   // For long-running analysis, use Ollama
   // Instead of external API calls
   ```

---

## Windows Auto-Start

To run UBOS automatically on system boot:

### Option 1: Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "UBOS Daily Operations"
4. Trigger: At startup
5. Action: Start a program
6. Program: `C:\Program Files\nodejs\node.exe`
7. Arguments: `C:\Users\User\Documents\AI\OpenClaw\local-manus-agent-workspace\ai-company-os\dist\start_ubos.js`
8. Start in: `C:\Users\User\Documents\AI\OpenClaw\local-manus-agent-workspace\ai-company-os`

### Option 2: PM2 (Node Process Manager)

```bash
npm install -g pm2

# Start UBOS
pm2 start dist/start_ubos.js --name ubos

# Save configuration
pm2 save

# Setup startup
pm2 startup
```

---

## Next Steps

1. ✅ **Run Demo** - Verify everything works
2. ✅ **Start UBOS** - Begin autonomous operations
3. ⏳ **Monitor First Day** - Watch Telegram notifications
4. ⏳ **Review Opportunities** - Check quality of scans
5. ⏳ **Approve/Deny** - Train the system on your preferences
6. ⏳ **Integrate LLM** - Connect Ollama for deeper analysis
7. ⏳ **Optimize** - Tune based on your feedback

---

## Support

**Files to Read:**
- `UBOS_README.md` - Full documentation
- `BRIAN_ROEMMELE_RESEARCH.md` - Philosophy and inspiration
- `UNIVERSAL_BUSINESS_OS_ARCHITECTURE.md` - Technical design

**Test Commands:**
- `npx tsx demo_ubos.ts` - Full system demo
- `python test_suite.py` - Health check
- `node dist/index.js status` - System status

**Logs:**
- Console output (real-time)
- `data/` directory (state files)
- Telegram (notifications)

---

## Summary

UBOS is now ready for 24/7 autonomous operation:

✅ **Orchestration:** Routes tasks to 8 specialized agents
✅ **Intelligence:** Scans for opportunities daily
✅ **Guardrails:** Financial blocks enforced in code
✅ **Automation:** Scheduled scans, reports, alerts
✅ **Monitoring:** Telegram notifications for everything
✅ **Flexibility:** Can handle any business type

The system will:
- Work autonomously on all non-financial tasks
- Ask for approval on spending/major decisions
- Report progress morning/evening
- Alert on blockers
- Identify opportunities continuously

You:
- Provide direction on what to pursue
- Approve/deny financial requests
- Review opportunities and decide
- Set strategic priorities

**Let's build an autonomous business together.**
