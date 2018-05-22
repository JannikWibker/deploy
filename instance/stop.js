const stopInstance = (exec, path, instance, cb) => {
  const str = `
    pgrep -P ${instance.process.pid} | while read line1;
    do
      pgrep -P $line1 | while read line2;
      do
        pgrep -P $line2 | while read line3;
        do
          pgrep -P $line3 | while read line4
          do
            echo $line4
            kill -15 $line4;
          done;
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
    echo ${instance.process.pid};`
  exec(str, {cwd: `${path}/${instance.name}`}, cb)
}

module.exports = stopInstance
