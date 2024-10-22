// const express = require('express');
// const Project = require('../models/Project');
// const User = require('../models/User');
// const auth = require('../middleware/auth');
// const multer = require('multer');

// const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });

// // Create new project (scientists only)
// router.post('/', auth, async (req, res) => {
//     try {
//         // Verify user is a scientist
//         const user = await User.findById(req.user.userId);
//         if (user.role !== 'scientist') {
//             return res.status(403).json({ error: 'Only scientists can create projects' });
//         }

//         const { title, description } = req.body;
//         const project = new Project({
//             title,
//             description,
//             creator: req.user.userId
//         });

//         await project.save();

//         // Populate creator details before sending response
//         await project.populate('creator', 'username role');
//         res.status(201).json(project);
//     } catch (error) {
//         console.error('Project creation error:', error);
//         res.status(500).json({ error: 'Failed to create project' });
//     }
// });

// // Get all projects with filtering based on user role
// router.get('/', auth, async (req, res) => {
//     try {
//         const user = await User.findById(req.user.userId);

//         let query = {};
//         if (user.role === 'scientist') {
//             // Scientists see only their own projects
//             query.creator = req.user.userId;
//         } else {
//             // Citizens see all projects created by scientists
//             const scientistUsers = await User.find({ role: 'scientist' }, '_id');
//             const scientistIds = scientistUsers.map(user => user._id);
//             query.creator = { $in: scientistIds };
//         }

//         const projects = await Project.find(query)
//             .populate('creator', 'username role')
//             .populate('submissions.user', 'username role');

//         res.json(projects);
//     } catch (error) {
//         console.error('Project fetch error:', error);
//         res.status(500).json({ error: 'Failed to fetch projects' });
//     }
// });

// // Submit PDF to project (citizens only)
// router.post('/submit', auth, upload.single('pdf'), async (req, res) => {
//     try {
//         const user = await User.findById(req.user.userId);
//         if (user.role !== 'citizen') {
//             return res.status(403).json({ error: 'Only citizens can submit to projects' });
//         }

//         const { projectId } = req.body;
//         const project = await Project.findById(projectId);

//         if (!project) {
//             return res.status(404).json({ error: 'Project not found' });
//         }

//         project.submissions.push({
//             user: req.user.userId,
//             pdf: {
//                 data: req.file.buffer,
//                 contentType: req.file.mimetype
//             },
//             submittedAt: new Date()
//         });

//         await project.save();
//         res.status(201).json({ message: 'PDF submitted successfully' });
//     } catch (error) {
//         console.error('PDF submission error:', error);
//         res.status(500).json({ error: 'Failed to submit PDF' });
//     }
// });

// // Get PDF submission
// router.get('/submissions/:submissionId', auth, async (req, res) => {
//     try {
//         const { submissionId } = req.params;

//         // Log the incoming request details
//         console.log('Submission request:', {
//             submissionId,
//             requestingUserId: req.user.userId
//         });

//         // Find the project and fully populate all necessary fields
//         const project = await Project.findOne(
//             { 'submissions._id': submissionId }
//         ).populate('creator', 'username role')
//             .populate('submissions.user', 'username role');

//         if (!project) {
//             console.log('Project not found for submission:', submissionId);
//             return res.status(404).json({ error: 'Project not found' });
//         }

//         console.log('Project found:', {
//             projectId: project._id,
//             creatorId: project.creator._id,
//             creatorRole: project.creator.role
//         });

//         const submission = project.submissions.find(
//             sub => sub._id.toString() === submissionId
//         );

//         if (!submission) {
//             console.log('Submission not found:', submissionId);
//             return res.status(404).json({ error: 'Submission not found' });
//         }

//         console.log('Submission found:', {
//             submissionId: submission._id,
//             submitterId: submission.user._id
//         });

//         // Get current user with role
//         const user = await User.findById(req.user.userId).select('role username');

//         console.log('Current user:', {
//             userId: user._id,
//             role: user.role,
//             username: user.username
//         });

//         // Check permissions
//         const isCreator = project.creator._id.toString() === req.user.userId;
//         const isSubmitter = submission.user._id.toString() === req.user.userId;
//         const isScientist = user.role === 'scientist';

//         console.log('Permission check:', {
//             isCreator,
//             isSubmitter,
//             isScientist
//         });

//         // Modified access control logic - Scientists who created the project can view submissions
//         if (isScientist && isCreator) {
//             // Allow access for project creator
//             console.log('Access granted: Scientist is the project creator');
//         } else if (!isScientist && isSubmitter) {
//             // Allow access for submission owner
//             console.log('Access granted: Citizen is the submission owner');
//         } else {
//             console.log('Access denied: Insufficient permissions');
//             return res.status(403).json({
//                 error: 'You do not have permission to view this submission'
//             });
//         }

//         // Access granted - serve the PDF
//         console.log('Access granted, serving PDF');
//         res.setHeader('Content-Type', submission.pdf.contentType || 'application/pdf');
//         res.setHeader('Content-Disposition', `inline; filename="submission-${submissionId}.pdf"`);
//         res.setHeader('Cache-Control', 'public, max-age=0');

//         res.send(submission.pdf.data);

//     } catch (error) {
//         console.error('Submission fetch error:', error);
//         res.status(500).json({ error: 'Failed to fetch submission' });
//     }
// });

// module.exports = router;


const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get PDF submission - Updated with correct permission logic
router.get('/submissions/:submissionId', auth, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const user = await User.findById(req.user.userId).select('role username');

        // Find the project containing the submission
        const project = await Project.findOne(
            { 'submissions._id': submissionId }
        ).populate('creator', 'username role')
            .populate('submissions.user', 'username role');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const submission = project.submissions.find(
            sub => sub._id.toString() === submissionId
        );

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Check user role and permissions
        const isScientist = user.role === 'scientist';
        const isProjectCreator = project.creator._id.toString() === user._id.toString();
        const isSubmitter = submission.user._id.toString() === user._id.toString();

        // Permission logic:
        // 1. Scientists can view PDFs if they created the project
        // 2. Citizens can only view their own submissions
        let hasPermission = false;

        if (isScientist) {
            hasPermission = isProjectCreator;
        } else {
            hasPermission = isSubmitter;
        }

        if (!hasPermission) {
            return res.status(403).json({
                error: 'You do not have permission to view this submission'
            });
        }

        // If we get here, user has permission to view the PDF
        res.setHeader('Content-Type', submission.pdf.contentType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="submission-${submissionId}.pdf"`);
        res.send(submission.pdf.data);

    } catch (error) {
        console.error('Submission fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

// Create new project (scientists only)
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.role !== 'scientist') {
            return res.status(403).json({ error: 'Only scientists can create projects' });
        }

        const { title, description } = req.body;
        const project = new Project({
            title,
            description,
            creator: req.user.userId
        });

        await project.save();
        await project.populate('creator', 'username role');
        res.status(201).json(project);
    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Get all projects with filtering based on user role
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        let query = {};
        if (user.role === 'scientist') {
            // Scientists see only their own projects
            query.creator = req.user.userId;
        }
        // Citizens see all projects (no query filter needed)

        const projects = await Project.find(query)
            .populate('creator', 'username role')
            .populate('submissions.user', 'username role');

        res.json(projects);
    } catch (error) {
        console.error('Project fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Submit PDF to project (citizens only)
router.post('/submit', auth, upload.single('pdf'), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.role !== 'citizen') {
            return res.status(403).json({ error: 'Only citizens can submit to projects' });
        }

        const { projectId } = req.body;
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.submissions.push({
            user: req.user.userId,
            pdf: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            },
            submittedAt: new Date()
        });

        await project.save();
        res.status(201).json({ message: 'PDF submitted successfully' });
    } catch (error) {
        console.error('PDF submission error:', error);
        res.status(500).json({ error: 'Failed to submit PDF' });
    }
});

module.exports = router;