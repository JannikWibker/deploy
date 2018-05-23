/* ## DEPENDENCIES AND SETUP ## */

const root_path = process.cwd() !== '/' ? process.cwd() : __dirname
console.log(root_path)

const express = require('express')
const bodyParser = require('body-parser')
const Datastore = require('nedb')
const db = new Datastore({filename: `${root_path}/db/deploy`, autoload: true})
const { spawn, exec } = require('child_process')

const PORT = 9123

const app = express()

const path = `${root_path}/deployments`
console.log(path)

const Instance = require('./instance/Instance.js')(spawn, exec, path)

const instances = {}
const running = {}

const status_code = {
  01: 'Instance does not exist, aborting',
  02: 'Instance already exists, aborting',
  03: 'Instance not running, aborting',
  04: 'Instance is running, aborting',
  05: 'not enough information, name must be specified',
  06: 'not enough information, kind must be specified (one of: "all_instances", "all_running", "all_not_running")',
  10: 'Instance added',
  20: 'Instance updated',
  30: 'Instance deleted',
  40: 'Instance started',
  50: 'Instance stopped',
  60: 'Status success',
  70: 'Log success',
}


app.use(bodyParser.json());
app.use('/', express.static('client'))


/* ## DB ON STARTUP ## */

db.find({}, (err, docs) => {
  if(err) throw err;

  if(docs) {
    docs.map(instance => {
      instances[instance.name] = new Instance(instance)
      if(instance.is_running) {
        console.log('[deploy] auto-starting instance: ' + instance.name)
        console.log(instance)
        instances[instance.name].start(x => running[instance.name] = instances[instance.name])
      } else {
        console.log('[deploy] not auto-starting instance: ' + instance.name)
      }
    })
  }
})

/* ## API ENDPOINTS ## */

app.post('/deploy/add', (req, res) => {
  console.log('[deploy] add instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      res.json({status_code: 04}) // Instance is running, aborting
    } else {
      res.json({status_code: 02}) // Instance already exists, aborting
    }
  } else {
    const instance = new Instance(req.body)
    instances[req.body.name] = instance
    instance.create((git_log, build_log, commit_log) => {
      db.insert(instance.toObject(), console.log)
      res.json({status_code: 10}) // Instance added
      // running[req.body.name] = instance // commented out because adding an Instance does not auto-start it anymore. Maybe added back in later with a special option or something
      console.log('GIT LOG: ', git_log, 'BUILD LOG: ', build_log, 'COMMIT LOG: ', commit_log)
    })
  }
})

app.post('/deploy/update', (req, res) => {
  console.log('[deploy] update instance')

  req.setTimeout(500000)

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      res.json({status_code: 04}) // Instance is running, aborting
    } else {
      instances[req.body.name].update(x => {
        console.log('it should print this and then crash (ECONNRESET)')
        res.json({status_code: 20}) // Instance updated
      })
    }
  } else {
    res.json({status_code: 01}) // Instance does not exist, aborting
  }
})

app.post('/deploy/delete', (req, res) => {
  console.log('[deploy] delete instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      res.json({status_code: 04}) // Instance is running, aborting
    } else {
      instances[req.body.name].delete(x => {
        delete instances[req.body.name]
        db.remove({name: req.body.name}, {multi: false}, console.log)
        res.json({status_code: 30}) // Instance deleted
      })
    }
  } else {
    res.json({status_code: 01}) // Instance does not exist, aborting
  }
})

app.post('/deploy/start', (req, res) => {
  console.log('[deploy] start instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      res.json({status_code: 04}) // Instance is running, aborting
    } else {
      instances[req.body.name].start(x => {
        db.update({name: req.body.name}, {$set: {is_running: true}}, console.log)
        running[req.body.name] = instances[req.body.name]
        res.json({status_code: 40}) // Instance started
      })
    }
  } else {
    res.json({status_code: 01}) // Instance does not exist, aborting
  }
})

app.post('/deploy/stop', (req, res) => {
  console.log('[deploy] stop instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      instances[req.body.name].stop(x => {
        db.update({name: req.body.name}, {$set: {is_running: false}}, console.log)
        delete running[req.body.name]
        res.json({status_code: 50}) // Instance stopped
      })
    } else {
      res.json({status_code: 03}) // Instance not running, aborting
    }
  } else {
    res.json({status_code: 01}) // Instance does not exist, aborting
  }
})

app.post('/deploy/status', (req, res) => {
  switch (req.body.kind) {
    case 'all_instances':
      res.json({
        instances: Object.values(instances).map(instance => instance.toObject()),
        kind: 'all_instances',
        status_code: 60 // Log success
      })
      break;
    case 'all_running':
    res.json({
      instances: Object.values(running).map(instance => instance.toObject()),
      kind: 'all_running',
      status_code: 60 // Log success
    })
      break;
    case 'all_not_running':
      res.json({
        instances: Object.keys(instances)
          .filter(name => !Object.keys(running).includes(name))
          .map(instance => instances[instance].toObject()),
        kind: 'all_not_running',
        status_code: 60 // Log success
      })
      break;
    case 'specific':
        req.body.name ? res.json({
          instances: [instances[req.body.name].toObject()],
          kind: 'specific',
          status_code: 60 // Log success
        }) : res.json({
          status_code: 05 // not enough information, name must be specified
        })
      break;
    default:
      res.json({
        status_code: 06 // not enough information, kind must be specified (one of: "all_instances", "all_running", "all_not_running")
      })
  }
})

app.post('/deploy/log', (req, res) => {
  console.log('[deploy] log instance')

  if(Object.keys(instances).includes(req.body.name)) {
    instances[req.body.name].log(logs => {
      res.json(Object.assign({ status_code: 70 }, logs)) // Log success
    })
  } else {
    res.write(status_code[01]) // Instance does not exist, aborting
  }
})

app.listen(PORT, () => console.log(`server started on port ${PORT}`))
