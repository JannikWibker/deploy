const express = require('express')
const bodyParser = require('body-parser')
const Datastore = require('nedb')
const db = new Datastore({filename: 'db/deploy', autoload: true})
//const db = new Datastore()
const { spawn, exec } = require('child_process')

const PORT = 9123

const app = express()

const path = `${process.cwd()}/deployments`
console.log(path)

const running = {}

const createInstance = (instance, cb) => {
  const bash = spawn('bash', ['-'], {cwd: path})
  bash.stdin.write(`
  trap "kill -9 $$" SIGINT
  if [ -d ${instance.name} ]; then
    cd ${instance.name}
    git pull origin master | tee -a ${path}/${instance.name}/buildlog.txt
  else
    git clone ${instance.repo} ${instance.name} | tee -a ${path}/${instance.name}/buildlog.txt
    cd ${instance.name}
  fi
  # ${instance.build.map(x => x + ` | tee -a ${path}/${instance.name}/buildlog.txt`).join('\n')}
  commit=$(git log -n 1 origin/master --pretty=format:"%H")
  echo "GIT_COMMIT:$commit:GIT_COMMIT"
  echo "instance ${instance.name} was created ($commit)."
  echo "finished."
  kill -9 $$
  `)
  let str = ''
  bash.stdout.on('data', x => {
    console.log('' + x)
    str += x
    const idx_start = str.indexOf('GIT_COMMIT:')
    const idx_end = str.indexOf(':GIT_COMMIT')
    if(idx_start !== -1 && idx_end !== -1) {
      console.log('found git commit: ', str.substring(idx_start+10, idx_end))
    }
    if(str.indexOf('finished.') !== -1) bash.kill('SIGINT')
  })
}

const startInstance = (instance) => {
  const bash = exec(`${instance.command} | tee -a ${`${path}/${instance.name}/log.txt`}`, {cwd: `${path}/${instance.name}`}, (err, stderr, stdout) => {
    console.log(stdout.replace(/\\n/g, '\n'))
  })
  return bash
}

db.find({}, (err, docs) => {
  console.log(err, docs)
})

app.use(bodyParser.json());
app.use(express.static('client'))

app.post('/deploy/add', (req, res) => {
  console.log('add instance')
  res.write('should deploy now ')

  const obj = {
    name: req.body.name,
    version: req.body.version,
    repo: req.body.repo,
    build: Array.isArray(req.body.build) ? req.body.build : [req.body.build],
    command: req.body.command,
    env: Array.isArray(req.body.env) ? req.body.env : [req.body.env],
    port: Array.isArray(req.body.port) ? req.body.port : [req.body.port],
  }

  const cb = (err, doc) => {
    if(err) throw err;
    if(running[req.body.name]) {
      res.write('\nstopping currently running instance')
      res.end()
      console.log('instance running; stopping..')
      const str = `
      pgrep -P ${running[req.body.name].pid} | while read line1;
      do
        pgrep -P $line1 | while read line2;
        do
          pgrep -P $line2 | while read line3;
          do
            echo $line3
            kill -15 $line3;
          done;
          echo $line2
          kill -15 $line2;
        done;
        echo $line1
        if ps -p $line1 > /dev/null
        then
          kill -15 $line1
        fi
      done;
      echo ${running[req.body.name].pid};`
      const killprocess = exec(str, {cwd: `${path}/${req.body.name}`}, (err, stderr, stdout) => {
        console.log(stdout.replace(/\\n/g, '\n'))
      })
      running[req.body.name] = null
    } else {
      res.end()
    }
    createInstance(doc, (git_log, build_log, commit_log) => {
      console.log('GIT LOG: ', git_log, 'BUILD LOG: ', build_log, 'COMMIT LOG: ', commit_log)
      db.update({_id: doc._id}, { $set: {'data.last_commit': commit_log}}, (err, num_replaced) =>
        console.log(err, num_replaced))
    })

  }
  db.findOne({name: req.body.name}, (err, doc) => {
    if(err) throw err;
    if(doc) {
      db.update({name: req.body.name}, obj, (err, numReplaced) => cb(err, obj))
      res.write('\nreplacing instance')
    } else {
      db.insert(obj, cb)
      res.write('\nadding instance')
    }
  })
})

app.post('/deploy/start', (req, res) => {
  console.log('start instance')
  res.write('should start instance now')
  db.findOne({name: req.body.name}, (err, doc) => {
    if(err) throw err;
    console.log(doc)
    running[req.body.name] = startInstance(doc)
    res.write('\ninstance started')
    res.end()
  })
})

app.post('/deploy/stop', (req, res) => {
  console.log('stop instance')
  res.write('should kill instance now')
  if(running[req.body.name]) {
    const str = `
    pgrep -P ${running[req.body.name].pid} | while read line1;
    do
      pgrep -P $line1 | while read line2;
      do
        pgrep -P $line2 | while read line3;
        do
          echo $line3
          kill -15 $line3;
        done;
        echo $line2
        kill -15 $line2;
      done;
      echo $line1
      if ps -p $line1 > /dev/null
      then
        kill -15 $line1
      fi
    done;
    echo ${running[req.body.name].pid};`
    const killprocess = exec(str, {cwd: `${path}/${req.body.name}`}, (err, stderr, stdout) => {
      console.log(stdout.replace(/\\n/g, '\n'))
    })
    res.write('\ninstance stopped.')
    res.end()
    running[req.body.name] = null
  } else {
    res.write('\ninstance not found')
    res.end()
  }
})

app.get('/deploy/status/:name/:version', (req, res) => {
  res.send('should get the status of the deployment (and the logs)')
})

app.listen(PORT, () => console.log(`server started on port ${PORT}`))
