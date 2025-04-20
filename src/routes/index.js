const router = require('express').Router();
const mondayRoutes = require('./monday');

router.use(mondayRoutes);

router.get('/', function (req, res) {
  res.json(getHealth());
});

router.get('/health', function (req, res) {
  res.json(getHealth());
  res.end();
});

router.post('/hitserver', function (req, res) {
  console.log(req.body);
  res.end();
});

function getHealth() {
  return {
    ok: true,
    message: 'Healthy',
  };
}

module.exports = router;
