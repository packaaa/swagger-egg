'use strict';

const path = require('path');
const fs = require('fs');

class RouterLoader {
  /** RouterLoader Class constructor
   *
   * @param  {string} filePath     - Router file path
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.routerMap = new Map();
    this.routerFileString = fs.readFileSync(filePath).toString();
  }

  /**
   * Get router infomation from common router file string
   *
   * @param {string} fileString - File string
   */
  getCommonRouter(fileString) {
    const routers = fileString.match(/(head|options|get|put|post|patch|delete|del|redirect)\((\s|\S)*?\)/g);
    if (routers) {
      routers.forEach(router => {
        const methodResult = router.match(/^(head|options|get|put|post|patch|delete|del|redirect)/g);
        const method = methodResult && methodResult[0];
        const actionResult = router.match(/\((\s|\S)*?\)$/g);
        const actionStr = actionResult && actionResult[0];
        const actionArray = actionStr.replace(/(\(|\)|\s)/g, '').split(',');
        const path = actionArray.shift().replace(/\'/g, '');
        const action = actionArray.pop();
        this.routerMap.set(action, {
          method,
          path,
        });
      });
    }
  }

  /**
   * Get router infomation from RESTful style router file string
   *
   * @param {string} fileString - File string
   */
  getRESTfulRouter(fileString) {
    const routers = fileString.match(/resources\((\s|\S)*?\)/g);
    if (routers) {
      routers.forEach(router => {
        let routerResource = router.replace(/(resources|\s|\(|\)|')/g, '');
        if (routerResource)routerResource = routerResource.split(',');
        routerResource.shift();
        const path = routerResource.shift();
        const action = routerResource.pop();
        [{
          action: `${action}.index`,
          method: 'get',
          path,
        }, {
          action: `${action}.new`,
          method: 'get',
          path: `${path}/new`,
        }, {
          action: `${action}.show`,
          method: 'get',
          path: `${path}/:id`,
        }, {
          action: `${action}.edit`,
          method: 'get',
          path: `${path}/:id/edit`,
        }, {
          action: `${action}.create`,
          method: 'post',
          path,
        }, {
          action: `${action}.update`,
          method: 'post',
          path: `${path}/:id`,
        }, {
          action: `${action}.destory`,
          method: 'delete',
          path: `${path}/:id`,
        }].forEach(item => {
          this.routerMap.set(item.action, {
            method: item.method,
            path: item.path,
          });
        });
      });
    }
  }

  /**
   * Get router infomation from mixin style router file string
   * @param {string} routerFileString - Router file string
   */
  getMixinRouter(routerFileString) {
    this.getRESTfulRouter(routerFileString);
    this.getCommonRouter(routerFileString);
  }

  /**
   * Get router infomation from target file
   *
   */
  getRouter() {
    const dependencies = this.routerFileString.match(/require\((\s|\S)*?\)/g);
    if (dependencies) {
      dependencies.map(item => item.replace(/(require|\(|\)|\s|')/g, '')).filter(dependency => dependency.includes('/router/')).forEach(dependencyPath => {
        const dependencyFileString = fs.readFileSync(path.join(path.dirname(this.filePath), `${dependencyPath}.js`)).toString();
        this.getMixinRouter(dependencyFileString);
      });
    }
    this.getMixinRouter(this.routerFileString);
  }
}

module.exports = RouterLoader;