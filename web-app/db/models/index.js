"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var sequelize = new Sequelize('stockiodb', "development", "password", {
    dialect: 'postgres',
    define: {
        timestamps: false
    }
});

// //Don't delete this guy. Need for development
// var dbPath = path.normalize(__dirname + '/..') + '/stockio.db';
// var sequelize = new Sequelize('stockio', null, null, {dialect: 'sqlite', storage: dbPath, logging: false})

var db = {};
fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
