const createInstance = (spawn, path, instance, cb) => {
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
  ${instance.build.map(x => x + ` | tee -a ${path}/${instance.name}/buildlog.txt`).join('\n')}
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
  bash.stdout.on('end', () => cb())
}

module.exports = createInstance
