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
  "command": "<command to be run on to start program>",
  "env": ["the environement variables that the program should be run with"],
  "port": ["<port(s) which are used>"]
}
```
