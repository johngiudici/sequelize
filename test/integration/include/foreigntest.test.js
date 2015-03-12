'use strict';

var chai = require('chai')
  , expect = chai.expect
  , Support = require(__dirname + '/../support')
  , Sequelize = require(__dirname + '/../../../index')
  , Promise = Sequelize.Promise
  , DataTypes = require(__dirname + '/../../../lib/data-types')
  , datetime = require('chai-datetime')
  , async = require('async')
  , Promise = require('bluebird');

chai.use(datetime);
chai.config.includeStack = true;

describe(Support.getTestDialectTeaser('Include'), function() {
  it('should get things', function() {
    var User = this.sequelize.define('User', { name: DataTypes.STRING(40) }, { timestamps: false })
      , Group = this.sequelize.define('Group', { name: DataTypes.STRING(40) }, { timestamps: false })
      , Permission = this.sequelize.define('Permission', { type: DataTypes.STRING(40) }, { timestamps: false });

      User.belongsToMany(Group, { through: 'UsersGroups' });
      User.belongsTo(Permission);
      Group.belongsToMany(User, { through: 'UsersGroups' });
      Group.belongsTo(Permission);
      Permission.hasMany(User);
      Permission.belongsToMany(Group, { through: 'GroupsPermissions' });
      var that = this;

      User.belongsToMany(Group, { through: 'UsersGroups' });
      Group.belongsToMany(User, { through: 'UsersGroups' });
      var users = [{ name: 'UserWithGroupWithAdminPermission' },
                   { name: 'UserWithAdminPermission' },
                   { name: 'UserWithAdminPermissionAndGroupWithAdminPermission'},
                   { name: 'UserWithUserPermission'},
                   { name: 'UserNoGroupOrPermission' }]
        , groups = [{ name: 'GroupWithAdminPermission'},
                    { name: 'GroupWithUserPermission'},
                    { name: "GroupNoPermission"}]
        , permissions = [{type: 'admin'},
                         {type: 'user'}];

      return this.sequelize.sync({ force: true }).then(function() {
        return Promise.all([
            User.create(users[0]),
            User.create(users[1]),
            User.create(users[2]),
            User.create(users[3]),
            User.create(users[4]),
            Group.create(groups[0]),
            Group.create(groups[1]),
            Group.create(groups[2]),
            Permission.create(permissions[0]),
            Permission.create(permissions[1])
          ]).then(function(instances) {
            var userInstances = instances.slice(0, 5);
            var groupInstances = instances.slice(5, 8);
            var permissionInstances = instances.slice(8);

            return Promise.all([ 
              userInstances[0].setGroups([groupInstances[0]]),
              userInstances[1].setPermission(permissionInstances[0]),
              userInstances[2].setGroups([groupInstances[0]]),
              userInstances[2].setPermission(permissionInstances[0]),
              userInstances[3].setPermission(permissionInstances[1]),
              groupInstances[0].setPermission(permissionInstances[0]),
              groupInstances[1].setPermission(permissionInstances[1])
            ]);
          }).then(function(r) {
            that.sequelize.options.logging = console.log;
            return User.findAll({
              include: [
              {
                model: Permission,
                where: { type: 'admin' },
                required: false,
              },
              {
                model: Group,
                include: [{
                  model: Permission,
                  where: { type: 'admin' },
                  required: false
                }]
              }
              ]
            });
          }).then(function(userInstances) {
            console.log(userInstances.length);
            //console.log(JSON.stringify(userInstances));
            userInstances.forEach(function(i) {
              //console.log(JSON.stringify(i));
            });
            that.sequelize.options.logging = false;
            return that.sequelize.query("SELECT `User`.`id`, `User`.`name`, `User`.`PermissionId`, `Permission`.`id` AS `Permission.id`, `Permission`.`type` AS `Permission.type`, `Groups`.`id` AS `Groups.id`, `Groups`.`name` AS `Groups.name`, `Groups`.`PermissionId` AS `Groups.PermissionId`, `Groups.UsersGroups`.`GroupId` AS `Groups.UsersGroups.GroupId`, `Groups.UsersGroups`.`UserId` AS `Groups.UsersGroups.UserId`, `Groups.Permission`.`id` AS `Groups.Permission.id`, `Groups.Permission`.`type` AS `Groups.Permission.type` FROM `Users` AS `User` LEFT OUTER JOIN `Permissions` AS `Permission` ON `User`.`PermissionId` = `Permission`.`id` LEFT OUTER JOIN `UsersGroups` AS `Groups.UsersGroups` ON `User`.`id` = `Groups.UsersGroups`.`UserId` LEFT OUTER JOIN `Groups` AS `Groups` ON `Groups`.`id` = `Groups.UsersGroups`.`GroupId` LEFT OUTER JOIN `Permissions` AS `Groups.Permission` ON `Groups`.`PermissionId` = `Groups.Permission`.`id` WHERE `Groups.Permission`.`type` = 'admin' AND `Permission`.`type` = 'admin';")
            .spread(function(results, metadata) {
              console.log(results);
            });
          });
      });
  });


});