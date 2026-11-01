import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isWorkspaceState } from '../frontend/src/lib/workspace-state.ts';
import { validSnapshot } from '../backend/dist/routes/workspace.js';
test('frontend and backend agree on valid workspace shapes and reject crash-prone records',()=>{
  const initial={nodes:[{id:'root',title:'Project',kind:'project',owner:'Owner',x:0,y:0,requirementIds:[]}],edges:[],requirements:[],changes:[],documents:[],history:[],nodeNotes:{},zoom:1,pan:{x:0,y:0},baselineConfirmed:false};
  for(const candidate of [initial,{...initial,nodes:[{id:'root',requirementIds:[]}]},{...initial,requirements:[{}]},{...initial,nodeNotes:{root:42}},{...initial,pan:null},{...initial,baselineConfirmed:'true'}]){
    assert.equal(isWorkspaceState(candidate),validSnapshot(candidate));
  }
  assert.equal(validSnapshot(initial),true);
});
