import {mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import './verify-pages-build.mjs';

const root = process.cwd();
function git(args, cwd=root, allowMissing=false) {
  const result=spawnSync('git',args,{cwd,encoding:'utf8',windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0&&!(allowMissing&&result.status===2))throw new Error(result.stderr||`Git exited ${result.status}`);
  return {output:result.stdout.trim(),status:result.status};
}
const remote=git(['remote','get-url','origin']).output;
if(remote!=='https://github.com/vrkatbekao-creator/STKSST.git')throw new Error('Unexpected deployment repository');
const revision=git(['rev-parse','HEAD']).output;
const version=JSON.parse(readFileSync('package.json','utf8')).version;
mkdirSync('.tools',{recursive:true});
const staging=mkdtempSync(join(resolve('.tools'),'pages-publish-'));
cpSync(resolve('dist'),staging,{recursive:true});
writeFileSync(join(staging,'RELEASE.json'),JSON.stringify({version,sourceCommit:revision,builtAt:new Date().toISOString()},null,2)+'\n');
git(['init','--initial-branch=gh-pages'],staging);
git(['remote','add','origin',remote],staging);
if(git(['ls-remote','--exit-code','--heads','origin','gh-pages'],staging,true).status===0){
  git(['fetch','--depth=1','origin','gh-pages'],staging);
  git(['reset','--mixed','FETCH_HEAD'],staging);
}
git(['add','-A'],staging);
git(['-c','user.name=vrkatbekao-creator','-c','user.email=vrkatbekao-creator@users.noreply.github.com','commit','-m',`Deploy v${version} from ${revision.slice(0,7)}`],staging);
const deployment=git(['rev-parse','HEAD'],staging).output;
// Push through the source repository so repository-scoped credential settings apply.
git(['fetch',staging,'gh-pages']);
git(['push','origin',`${deployment}:refs/heads/gh-pages`]);
console.log(JSON.stringify({site:'https://vrkatbekao-creator.github.io/STKSST/',version,sourceCommit:revision,branch:'gh-pages'}));
