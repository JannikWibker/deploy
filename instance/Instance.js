const createInstance = require('./create.js')
const startInstance = require('./start.js')
const stopInstance = require('./stop.js')
const deleteInstance = require('./delete.js')

module.exports = (spawn, exec, path, db) => {

  return class Instance {
    constructor(obj, spawn, exec, path) {
      if(obj) {
        Object.assign(this, {is_running: false}, {
          name: obj.name,
          version: obj.version,
          repo: obj.repo,
          build: Array.isArray(obj.build) ? obj.build : [obj.build],
          run: obj.run,
          env: Array.isArray(obj.env) ? obj.env : [obj.env],
          port: Array.isArray(obj.port) ? obj.port : [obj.port],
        })
      }
    }

    create(cb) {
      console.log('[Instance] create')
      return createInstance(spawn, path, this, cb)
    }

    start(cb) {
      console.log('[Instance] start')
      this.is_running = true
      this.process = startInstance(exec, path, this, cb)
      return this
    }

    stop(cb) {
      console.log('[Instance] stop')
      this.is_running = false
      return stopInstance(exec, path, this, cb)
    }

    update(cb) {
      console.log('[Instance] update')
      return createInstance(spawn, path, this, cb)
    }

    delete(cb) {
      console.log('[Instance] delete')
      return deleteInstance(path, this, cb)
    }

    toObject() {
      // this exists because the version that is saved to the database does not need PID and so on.
      return {
        name: this.name,
        version: this.version,
        repo: this.repo,
        build: this.build,
        run: this.run,
        env: this.env,
        port: this.port,
        is_running: this.is_running,
      }
    }
  }


}
