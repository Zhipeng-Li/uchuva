var express = require('express');
var router = express.Router();
var DagExe = require('../models/dagExe.js');
var logger = require('../utils/logger.js');
var isAuthenticated = require('../utils/login.js');
var expressValidator = require('express-validator');

module.exports = function(app){
  app.use('/', router);

  function build(idBuild, userId, cb){
      DagExe.findOne({
          nombre: idBuild,
          userid: userId
      }, function(error, dag) {
          if (error) {
              cb(error);
              return;
          }
          if (!dag) {
              cb("No existe el dag");
              return;
          }
          var edges = dag.edges || [];
          var nodes = dag.nodes || [];
          nodes.forEach(function(nodo) {
              if (!nodo.configurado.programa) {
                  nodo.configurado = undefined;
              }
          });
          cb(null, {
              proyecto: dag.proyecto,
              nodes: JSON.stringify(nodes),
              edges: JSON.stringify(edges),
              title: dag.nombre
          });
      });
  }

  router.get('/build', isAuthenticated, function(req, res) {
      req.checkQuery('id', 'Invalid id').notEmpty().isAlphanumeric();
      var errors = req.validationErrors();
      if (errors) {
          var asStr = errors.map(function(e){
            return e.msg;
          }).join(",");

          res.format({
              html: function() {
                  req.flash('error', asStr);
                  res.redirect('/user');
              },
              json: function() {
                  res.json({code : 1, message : asStr});
              }
          });
          return;
      }
      var idBuild = req.query.id;
      var userId = req.user._id;
      build(idBuild,userId, function(error, result) {
          if (error) {
              logger.error(error+", dag "+idBuild+", user: "+userId);
              res.format({
                  html: function() {
                      req.flash('error', error);
                      res.redirect('/user');
                  },
                  json: function() {
                      res.json({code : 2, message : error});
                  }
              });
              return;
          }
          res.format({
              html: function() {
                  res.render('build', result);
              },
              json: function() {
                  res.json(result);
              }
          });
      });
  });

  function builds(idProyecto, idUsuario, cb) {
    // TODO: Comprobar que el DAG existe
      DagExe.find({
          userid: idUsuario,
          proyecto: idProyecto
      }, null, {
          sort: {
              date: -1
          }
      }, cb);
  }
  router.get('/builds', isAuthenticated, function(req, res) {
    req.checkQuery('id', 'Invalid id').notEmpty().isAlphanumeric();
    var errors = req.validationErrors();
    if (errors) {
      var asStr = errors.map(function(e){
        return e.msg;
      }).join(",");

        res.format({
            html: function() {
                req.flash('error', asStr);
                res.redirect('/user');
            },
            json: function() {
                res.json({
                  code : 1,
                  message : errors.map(function(e){
                    return e.msg;
                  }).join(",")
                });
            }
        });
        return;
    }
    var idProyecto = req.query.id;
    var userId = req.user._id;
    builds(idProyecto, userId, function(err, dags) {
          if (err) {
            logger.error(error+", dag "+idBuild+", user: "+userId);
            res.format({
                html: function() {
                    req.flash('error', error);
                    res.redirect('/user');
                },
                json: function() {
                    res.json({code : 2, message : err});
                }
            });
            return;
          }
          res.format({
              html: function() {
                  res.render('builds', {
                      user: req.user,
                      dags: dags,
                      title: "Ejecuciones"
                  });
              },
              json: function() {
                  res.json(dags);
              }
          });
      });
  });
};