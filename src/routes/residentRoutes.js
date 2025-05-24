const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');

router.post('/names', residentController.getResidentNames);

module.exports = router;