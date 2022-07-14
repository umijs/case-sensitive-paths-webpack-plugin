// query
require('./Other?xx');

// non-js module & asset/inline
require('./Other.css');

// dir
require('./Child');

// sub-dir
require('./Child/Son/A');
require('./Child/Son/B');

// hash dir
require('./#/Hash');

// skip node_modules
require('../node_modules/Test');
