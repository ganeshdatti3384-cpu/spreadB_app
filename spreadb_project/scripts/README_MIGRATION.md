# Database Migration: Completed Applications

## Purpose
This migration script updates all applications with approved submissions to "completed" status. This fixes historical data where applications were stuck in "accepted" state even after work was approved.

## What It Does

1. **Finds** all submissions with status = "approved"
2. **Locates** their corresponding applications
3. **Updates** application status from "accepted" to "completed"
4. **Reports** detailed statistics

## Before Running

### Prerequisites
- Node.js installed
- MongoDB running and accessible
- `.env` file configured with `MONGODB_URI`

### Backup (Recommended)
```bash
# Backup your database before running migration
mongodump --uri="your_mongodb_uri" --out=./backup-before-migration
```

## How to Run

### Step 1: Navigate to Project Root
```bash
cd spreadb_project-main
```

### Step 2: Run the Migration
```bash
node scripts/migrate-completed-applications.js
```

### Step 3: Verify Results
Check the console output for:
- ✅ Number of applications updated
- ✓ Number already completed
- ⚠️ Any warnings or errors

## Expected Output

```
🚀 Application Completion Status Migration
============================================================
🔄 Starting migration...
📡 Connecting to MongoDB: mongodb://***@localhost:27017/spreadb
✅ Connected to MongoDB

📊 Found 15 approved submissions

🔄 Processing submissions...

✅ Updated application 507f1f77bcf86cd799439011 to completed
   Campaign: 507f191e810c19729de860ea
   Influencer: 507f191e810c19729de860eb
   Brand: 507f191e810c19729de860ec

✓  Application 507f1f77bcf86cd799439012 already completed

...

============================================================
📊 MIGRATION SUMMARY
============================================================
Total approved submissions: 15
✅ Updated to completed: 12
✓  Already completed: 2
⚠️  Application not found: 1
❌ Errors: 0
============================================================

✨ Migration completed successfully!
💡 Tip: Refresh your frontend to see the updated statuses

👋 Disconnected from MongoDB
```

## What Gets Updated

### Before Migration
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  campaignId: "507f191e810c19729de860ea",
  influencerId: "507f191e810c19729de860eb",
  status: "accepted",  // ❌ Stuck here even after approval
  ...
}
```

### After Migration
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  campaignId: "507f191e810c19729de860ea",
  influencerId: "507f191e810c19729de860eb",
  status: "completed",  // ✅ Correctly marked as completed
  ...
}
```

## Safety Features

### Non-Destructive
- Only updates applications that need updating
- Skips applications already marked as "completed"
- Doesn't modify any other data

### Error Handling
- Wrapped in try-catch blocks
- Continues processing even if one update fails
- Reports all errors at the end

### Idempotent
- Safe to run multiple times
- Won't duplicate updates
- Checks current status before updating

## Verification

### Check Updated Applications
```javascript
// In MongoDB shell or Compass
db.applications.find({ status: "completed" }).count()
```

### Check Approved Submissions
```javascript
// Should match the number of completed applications
db.campaignsubmissions.find({ status: "approved" }).count()
```

### Frontend Verification
1. Login as influencer
2. Go to "My Applications"
3. Check "Completed" tab
4. Verify approved work shows as completed

## Troubleshooting

### Error: Cannot connect to MongoDB
**Solution**: Check your `.env` file has correct `MONGODB_URI`

### Error: Application not found
**Reason**: Submission references a deleted application
**Impact**: No impact, migration continues

### Error: Permission denied
**Solution**: Ensure MongoDB user has write permissions

### No updates made
**Reason**: All applications already in correct state
**Action**: No action needed, database is up to date

## Rollback (If Needed)

If you need to rollback:

```javascript
// In MongoDB shell
db.applications.updateMany(
  { status: "completed" },
  { $set: { status: "accepted" } }
)
```

**Note**: Only rollback if absolutely necessary. The "completed" status is the correct state for approved work.

## After Migration

### For Influencers
- ✅ Can now see completed work in "Completed" tab
- ✅ Clear separation between active and finished campaigns
- ✅ Better portfolio tracking

### For Brand Owners
- ✅ Can track completion rates
- ✅ See which campaigns are finished
- ✅ Better campaign analytics

### For Platform
- ✅ Accurate workflow states
- ✅ Complete audit trail
- ✅ Better reporting capabilities

## Future Runs

This migration is **one-time** for historical data. Going forward:
- New approvals automatically update application status
- No manual migration needed
- Code handles it in `submission_controller.js`

## Support

If you encounter issues:
1. Check the error message in console
2. Verify MongoDB connection
3. Check application and submission IDs
4. Review the migration log

---

**Created**: January 22, 2026
**Purpose**: Fix historical data for completed applications
**Safe to run**: Yes (idempotent and non-destructive)
