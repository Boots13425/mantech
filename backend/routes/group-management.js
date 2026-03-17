const express = require("express")
const router = express.Router()
const db = require("../db")

// Helper: SQL condition for "active" interns (accept null/empty/mixed-case as active)
const ACTIVE_INTERN_CONDITION = `(i.status IS NULL OR i.status = '' OR LOWER(i.status) = 'active')`
const ACTIVE_INTERN_CONDITION_RAW = `(status IS NULL OR status = '' OR LOWER(status) = 'active')`


// Utility function to group interns by school
function groupInternsBySchool(interns) {
  const schoolGroups = {}
  interns.forEach((intern) => {
    const school = intern.school || "Unknown"
    if (!schoolGroups[school]) {
      schoolGroups[school] = []
    }
    schoolGroups[school].push(intern)
  })
  return schoolGroups
}

// Utility function to calculate optimal number of groups
function calculateOptimalGroups(totalInterns) {
  const MAX_GROUP_SIZE = 4
  const MIN_GROUP_SIZE = 3

  if (totalInterns <= MIN_GROUP_SIZE) {
    return 1
  }

  if (totalInterns <= MAX_GROUP_SIZE) {
    return 1
  }

  // Calculate number of groups: aim for 4-5 per group when possible
  const optimalPerGroup = 4
  let numGroups = Math.ceil(totalInterns / optimalPerGroup)

  // Ensure groups aren't too small
  while (totalInterns / numGroups < MIN_GROUP_SIZE && numGroups > 1) {
    numGroups--
  }

  return numGroups
}

// Utility function to perform school-aware round-robin distribution
function distributeInterns(interns, numGroups) {
  const groups = Array.from({ length: numGroups }, () => [])
  const schoolGroups = groupInternsBySchool(interns)

  let currentGroup = 0
  const schools = Object.keys(schoolGroups)
  const schoolPointers = {}
  schools.forEach((school) => {
    schoolPointers[school] = 0
  })

  // Round-robin distribution across schools
  let totalAssigned = 0
  const totalInterns = interns.length

  while (totalAssigned < totalInterns) {
    for (const school of schools) {
      if (schoolPointers[school] < schoolGroups[school].length) {
        const intern = schoolGroups[school][schoolPointers[school]]
        groups[currentGroup % numGroups].push(intern)
        schoolPointers[school]++
        totalAssigned++
        currentGroup++

        if (totalAssigned >= totalInterns) break
      }
    }
  }

  return groups
}

// Utility function to calculate school diversity metrics
function calculateDiversityMetrics(groups) {
  return groups.map((group, index) => {
    const schoolCount = {}
    group.forEach((intern) => {
      const school = intern.school || "Unknown"
      schoolCount[school] = (schoolCount[school] || 0) + 1
    })

    const values = Object.values(schoolCount)
    const maxFromOneSchool = values.length ? Math.max(...values) : 0
    const schools = Object.keys(schoolCount).length
    const diversity = schools / Math.max(group.length, 1)

    return {
      groupIndex: index,
      schoolDistribution: schoolCount,
      schoolCount: schools,
      totalMembers: group.length,
      maxFromOneSchool: maxFromOneSchool,
      diversity: diversity,
      hasWeakDiversity: maxFromOneSchool > group.length * 0.6 && group.length > 2,
    }
  })
}

// API endpoint: Generate groups (Proposal Phase - doesn't save yet)
router.post("/generate", async (req, res) => {
  try {
    // Fetch all active interns (robust to NULL/empty/mixed-case status)
    const [interns] = await db.query(
      `SELECT id, first_name, last_name, email, school, department 
       FROM interns i
       WHERE ${ACTIVE_INTERN_CONDITION_RAW}
       ORDER BY school, first_name, last_name`,
    )

    if (interns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active interns found to group",
      })
    }

    // Calculate optimal number of groups
    const numGroups = calculateOptimalGroups(interns.length)

    // Distribute interns using school-aware round-robin
    const proposedGroups = distributeInterns(interns, numGroups)

    // Calculate diversity metrics
    const diversityMetrics = calculateDiversityMetrics(proposedGroups)

    // Build proposal response
    const proposal = proposedGroups.map((group, index) => ({
      groupNumber: index + 1,
      groupName: `Project Group ${index + 1}`,
      members: group,
      metrics: diversityMetrics[index],
      warnings: diversityMetrics[index].hasWeakDiversity
        ? [`Group has ${diversityMetrics[index].maxFromOneSchool} interns from same school`]
        : [],
    }))

    res.json({
      success: true,
      data: {
        totalInterns: interns.length,
        numGroups: numGroups,
        proposal: proposal,
        generatedAt: new Date(),
        message: "Groups generated successfully. Review and confirm to save.",
      },
    })
  } catch (error) {
    console.error("Group generation error:", error)
    res.status(500).json({
      success: false,
      message: "Error generating groups",
      error: error.message,
    })
  }
})

// API endpoint: Confirm and save groups (Confirmation Phase)
router.post("/confirm", async (req, res) => {
  const { proposal, userId } = req.body
  const MAX_GROUP_SIZE = 4

  // Resolve a valid user id (body, auth middleware, or fallback env). If still missing, default to 1 (admin).
  let effectiveUserId = userId || (req.user && req.user.id) || (process.env.SYSTEM_USER_ID ? parseInt(process.env.SYSTEM_USER_ID, 10) : null)
  if (!effectiveUserId) {
    console.warn("No userId supplied and SYSTEM_USER_ID not set; falling back to admin user id 1.")
    effectiveUserId = 1
  }

  if (!proposal || !Array.isArray(proposal)) {
    return res.status(400).json({
      success: false,
      message: "Invalid proposal data",
    })
  }

  // Basic validations: no duplicate intern across proposal groups & group size checks
  const internIdToGroup = {}
  const allMemberIds = []
  for (const p of proposal) {
    if (!Array.isArray(p.members)) {
      return res.status(400).json({ success: false, message: "Each proposed group must include a members array" })
    }
    if (p.members.length > MAX_GROUP_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Proposed group ${p.groupName || p.groupNumber} exceeds maximum size of ${MAX_GROUP_SIZE}`,
      })
    }
    for (const m of p.members) {
      allMemberIds.push(m.id)
      if (internIdToGroup[m.id]) {
        return res.status(400).json({
          success: false,
          message: `Intern ${m.id} appears in multiple proposed groups (duplicate)`,
        })
      }
      internIdToGroup[m.id] = p.groupNumber || p.groupName
    }
  }

  // Validate that all referenced interns exist and are active
  const uniqueMemberIds = [...new Set(allMemberIds)]
  if (uniqueMemberIds.length === 0) {
    return res.status(400).json({ success: false, message: "Proposal contains no members" })
  }

  try {
    const placeholders = uniqueMemberIds.map(() => "?").join(",")
    const [validRows] = await db.query(
      `SELECT id FROM interns WHERE id IN (${placeholders}) AND ${ACTIVE_INTERN_CONDITION_RAW}`,
      uniqueMemberIds,
    )

    const validIds = new Set(validRows.map((r) => r.id))
    const invalidIds = uniqueMemberIds.filter((id) => !validIds.has(id))
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some interns are invalid or not active",
        invalidInternIds: invalidIds,
      })
    }
  } catch (error) {
    console.error("Validation error before confirm:", error)
    return res.status(500).json({ success: false, message: "Error validating proposal", error: error.message })
  }

  const connection = await db.promise().getConnection()

  try {
    await connection.beginTransaction()

    // Create group records
    const groupIds = []
    for (const proposedGroup of proposal) {
      const [groupResult] = await connection.query(
        `INSERT INTO groups (group_name, group_number, created_by, status, cycle_start_date)
         VALUES (?, ?, ?, 'active', CURDATE())`,
        [proposedGroup.groupName, proposedGroup.groupNumber, effectiveUserId],
      )

      groupIds.push(groupResult.insertId)

      // Add group members
      for (const member of proposedGroup.members) {
        await connection.query(
          `INSERT INTO group_members (group_id, intern_id, assigned_by, status)
           VALUES (?, ?, ?, 'active')`,
          [groupResult.insertId, member.id, effectiveUserId],
        )
      }

      // Log group creation
      await connection.query(
        `INSERT INTO group_audit_logs (group_id, action, action_by, new_values, details)
         VALUES (?, 'CREATE', ?, ?, ?)`,
        [
          groupResult.insertId,
          effectiveUserId,
          JSON.stringify({
            groupName: proposedGroup.groupName,
            memberCount: proposedGroup.members.length,
            schoolDistribution: proposedGroup.metrics ? proposedGroup.metrics.schoolDistribution : {},
          }),
          `Auto-generated group with ${proposedGroup.members.length} members`,
        ],
      )
    }

    await connection.commit()

    // Respond with created groups summary so front-end can refresh immediately
    res.json({
      success: true,
      message: "Groups saved successfully",
      data: {
        groupIds: groupIds,
        totalGroups: proposal.length,
        totalMembers: proposal.reduce((sum, g) => sum + g.members.length, 0),
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error("Group confirmation error:", error)
    res.status(500).json({
      success: false,
      message: "Error confirming groups",
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

// API endpoint: Get all groups with members
router.get("/all", async (req, res) => {
  try {
    const [groups] = await db.query(
      `SELECT g.id, g.group_name, g.group_number, g.status, g.created_at, 
              COUNT(gm.id) as member_count
       FROM groups g
       LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.status = 'active'
       GROUP BY g.id
       ORDER BY g.group_number`,
    )

    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const [members] = await db.query(
          `SELECT i.id, i.first_name, i.last_name, i.school, i.email, i.department
           FROM group_members gm
           JOIN interns i ON gm.intern_id = i.id
           WHERE gm.group_id = ? AND gm.status = 'active'
           ORDER BY i.first_name`,
          [group.id],
        )

        return {
          ...group,
          members: members,
        }
      }),
    )

    res.json({
      success: true,
      data: enrichedGroups,
    })
  } catch (error) {
    console.error("Fetch groups error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching groups",
      error: error.message,
    })
  }
})

// API endpoint: Get single group details
router.get("/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params

    const [groups] = await db.query(`SELECT * FROM groups WHERE id = ?`, [groupId])

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      })
    }

    const [members] = await db.query(
      `SELECT i.id, i.first_name, i.last_name, i.school, i.email, i.department, gm.assigned_at
       FROM group_members gm
       JOIN interns i ON gm.intern_id = i.id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY i.first_name`,
      [groupId],
    )

    const [auditLogs] = await db.query(
      `SELECT ral.id, ral.action, ral.action_timestamp, u.full_name, ral.details
       FROM group_audit_logs ral
       JOIN users u ON ral.action_by = u.id
       WHERE ral.group_id = ?
       ORDER BY ral.action_timestamp DESC
       LIMIT 20`,
      [groupId],
    )

    res.json({
      success: true,
      data: {
        ...groups[0],
        members: members,
        auditLogs: auditLogs,
      },
    })
  } catch (error) {
    console.error("Fetch group details error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching group details",
      error: error.message,
    })
  }
})

// API endpoint: Move intern between groups (Manual Override)
router.post("/move-member", async (req, res) => {
  const { fromGroupId, toGroupId, internId, userId } = req.body
  const MAX_GROUP_SIZE = 4

  if (!fromGroupId || !toGroupId || !internId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    })
  }

  // resolve actor id (allow admin fallback)
  const moveBy = userId || (req.user && req.user.id) || (process.env.SYSTEM_USER_ID ? parseInt(process.env.SYSTEM_USER_ID, 10) : 1)

  if (fromGroupId === toGroupId) {
    return res.status(400).json({
      success: false,
      message: "Source and destination group must be different",
    })
  }

  const connection = await db.promise().getConnection()

  try {
    await connection.beginTransaction()

    // Verify intern is currently in source group and active
    const [cur] = await connection.query(
      `SELECT id FROM group_members WHERE group_id = ? AND intern_id = ? AND status = 'active'`,
      [fromGroupId, internId],
    )
    if (cur.length === 0) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: "Intern not found in the source group or not active" })
    }

    // Check destination group size
    const [destGroupMembers] = await connection.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = 'active'`,
      [toGroupId],
    )

    if (destGroupMembers[0].count >= MAX_GROUP_SIZE) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: `Cannot move: destination group would exceed maximum size of ${MAX_GROUP_SIZE}`,
      })
    }

    // Update member assignment
    await connection.query(
      `UPDATE group_members 
       SET group_id = ?, assigned_at = NOW(), assigned_by = ?
       WHERE group_id = ? AND intern_id = ?`,
      [toGroupId, moveBy, fromGroupId, internId],
    )

    // Log the movement
    await connection.query(
      `INSERT INTO group_audit_logs (group_id, action, action_by, details)
       VALUES (?, 'MOVE_MEMBER', ?, ?)`,
      [toGroupId, moveBy, `Moved intern ${internId} from group ${fromGroupId}`],
    )

    await connection.commit()

    res.json({
      success: true,
      message: "Member moved successfully",
    })
  } catch (error) {
    await connection.rollback()
    console.error("Move member error:", error)
    res.status(500).json({
      success: false,
      message: "Error moving member",
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

// API endpoint: Remove intern from group
router.post("/remove-member", async (req, res) => {
  const { groupId, internId, userId } = req.body

  if (!groupId || !internId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    })
  }

  const removedBy = userId || (req.user && req.user.id) || (process.env.SYSTEM_USER_ID ? parseInt(process.env.SYSTEM_USER_ID, 10) : 1)

  try {
    // Mark as removed
    await db.query(
      `UPDATE group_members 
       SET status = 'removed'
       WHERE group_id = ? AND intern_id = ?`,
      [groupId, internId],
    )

    // Log removal
    await db.query(
      `INSERT INTO group_audit_logs (group_id, action, action_by, details)
       VALUES (?, 'REMOVE_MEMBER', ?, ?)`,
      [groupId, removedBy, `Removed intern ${internId} from group`],
    )

    res.json({
      success: true,
      message: "Member removed successfully",
    })
  } catch (error) {
    console.error("Remove member error:", error)
    res.status(500).json({
      success: false,
      message: "Error removing member",
      error: error.message,
    })
  }
})

// API endpoint: Add intern to group
router.post("/add-member", async (req, res) => {
  const { groupId, internId, userId } = req.body
  const MAX_GROUP_SIZE = 4

  if (!groupId || !internId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    })
  }

  const addedBy = userId || (req.user && req.user.id) || (process.env.SYSTEM_USER_ID ? parseInt(process.env.SYSTEM_USER_ID, 10) : 1)

  try {
    // Verify intern exists and is active
    const [internRows] = await db.query(
      `SELECT id FROM interns WHERE id = ? AND ${ACTIVE_INTERN_CONDITION_RAW}`,
      [internId],
    )
    if (internRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Intern not found or not active",
      })
    }

    // Check if already in group
    const [existing] = await db.query(
      `SELECT id FROM group_members 
       WHERE group_id = ? AND intern_id = ? AND status = 'active'`,
      [groupId, internId],
    )

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Intern is already in this group",
      })
    }

    // Check group size
    const [groupMembers] = await db.query(
      `SELECT COUNT(*) as count FROM group_members 
       WHERE group_id = ? AND status = 'active'`,
      [groupId],
    )

    if (groupMembers[0].count >= MAX_GROUP_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Group is at maximum capacity (4 members)",
      })
    }

    // Add member
    await db.query(
      `INSERT INTO group_members (group_id, intern_id, assigned_by, status)
       VALUES (?, ?, ?, 'active')`,
      [groupId, internId, addedBy],
    )

    // Log addition
    await db.query(
      `INSERT INTO group_audit_logs (group_id, action, action_by, details)
       VALUES (?, 'ADD_MEMBER', ?, ?)`,
      [groupId, addedBy, `Added intern ${internId} to group`],
    )

    res.json({
      success: true,
      message: "Member added successfully",
    })
  } catch (error) {
    console.error("Add member error:", error)
    res.status(500).json({
      success: false,
      message: "Error adding member",
      error: error.message,
    })
  }
})

module.exports = router
