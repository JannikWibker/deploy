### how it should work

start index.js
open webinterface
add git repository to be used by `deploy`
`deploy` clones the repo, runs `yarn` or other build steps, starts the script with `node` (or other specified commands)

#### this is how the database structure should look

```json
{
  "name": "<unique name>",
  "version": "<version associated with the unique name (or taken from package.json)>",
  "build": ["<the build steps to be able to build the program>"],
  "run": "<command to be run on to start program>",
  "env": ["the environement variables that the program should be run with"],
  "port": ["<port(s) which are used>"]
}
```

#### Status codes

```js
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
```
