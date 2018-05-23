const logInstance = (path, instance, cb) => {
  cb({
    build_log: 'this will contain the contents of build_log.txt',
    run_log: 'this will contain the contents of log.txt',
  })
}

module.exports = logInstance
