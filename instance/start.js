const startInstance = (exec, path, instance, cb) => {
  const bash = exec(`${instance.run} | tee -a ${`${path}/${instance.name}/log.txt`}`, {cwd: `${path}/${instance.name}`}, (err, stderr, stdout) => {
    console.log(stdout.replace(/\\n/g, '\n'))
  })
  cb(instance)
  return bash
}

module.exports = startInstance
