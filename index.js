/* ## DEPENDENCIES AND SETUP ## */

const express = require('express')
const bodyParser = require('body-parser')
const Datastore = require('nedb')
const db = new Datastore({filename: 'db/deploy', autoload: true})
const { spawn, exec } = require('child_process')

const PORT = 9123

const app = express()

const path = `${process.cwd() !== '/' ? process.cwd() : __dirname}/deployments`
console.log(path)

const Instance = require('./instance/Instance.js')(spawn, exec, path)

const instances = {}
const running = {}


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
  res.write('[deploy] add instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      res.write('\nInstance already running, aborting')
      res.end()
    } else {
      res.write('\nInstance already exists, aborting')
      res.end()
    }
  } else {
    const instance = new Instance(req.body)
    instances[req.body.name] = instance
    db.insert(instance.toObject(), console.log)
    res.write('\nInstance added')
    res.end()
    instance.create((git_log, build_log, commit_log) => {
      running[req.body.name] = instance
      console.log('GIT LOG: ', git_log, 'BUILD LOG: ', build_log, 'COMMIT LOG: ', commit_log)
    })
  }
})

app.post('/deploy/update', (req, res) => {
  console.log('[deploy] update instance')
  res.write('[deploy] update instance')
})

app.post('/deploy/delete', (req, res) => {
  console.log('[deploy] delete instance')
  res.write('[deploy] delete instance')
})

app.post('/deploy/start', (req, res) => {
  console.log('[deploy] start instance')
  res.write('[deploy] start instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      res.write('\nInstance already running, aborting')
      res.end()
    } else {
      instances[req.body.name].start(x => {
        db.update({name: req.body.name}, {$set: {is_running: true}}, console.log)
        running[req.body.name] = instances[req.body.name]
        res.write('\nInstance started')
        res.end()
      })
    }
  } else {
    res.write('\Instance does not exist, aborting')
    res.end()
  }
})

app.post('/deploy/stop', (req, res) => {
  console.log('[deploy] stop instance')
  res.write('[deploy] stop instance')

  if(Object.keys(instances).includes(req.body.name)) {
    if(Object.keys(running).includes(req.body.name)) {
      instances[req.body.name].stop(x => {
        db.update({name: req.body.name}, {$set: {is_running: false}}, console.log)
        delete running[req.body.name]
        res.write('\nInstance stopped')
        res.end()
      })
    } else {
      res.write('\Instance not running, aborting')
      res.end()
    }
  } else {
    res.write('\Instance does not exist, aborting')
    res.end()
  }
})

app.get('/deploy/status/:name/:version', (req, res) => {
  res.send('should get the status of the deployment (and the logs)')
})

app.post('/_/deploy/add', (req, res) => {
  console.log('[deploy] add instance')

  const instance = new Instance(req.body)

  db.findOne({name: req.body.name}, (err, doc) => {
    if(err) throw err;
    if(doc) {
      res.write('\nInstance already exists, aborting')
    } else {
      db.insert(instance.toObject(), (err, doc) => {
        if(err) throw err;
        if(Object.keys(running).includes(req.body.name)) {
          res.write('\nInstance already running, aborting')
        } else {
          instance.create((git_log, build_log, commit_log) => {
            running[req.body.name] = instance
            console.log('GIT LOG: ', git_log, 'BUILD LOG: ', build_log, 'COMMIT LOG: ', commit_log)
          })
        }
      })
      res.write('\nInstance added')
    }
  })
})

app.listen(PORT, () => console.log(`server started on port ${PORT}`))
