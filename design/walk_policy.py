"""Game eligibility, not a legal/public-access certification. Preserve unknown tags."""
ALLOWED_FOOT={'yes','designated','permissive','official'}
ORDINARY={'primary','secondary','tertiary','residential','living_street','unclassified','service','road','track','footway','pedestrian','path','steps','bridleway','primary_link','secondary_link','tertiary_link'}
def eligibility(tags,node=False):
 foot=tags.get('foot','unknown');access=tags.get('access','unknown')
 if tags.get('foot:conditional') or tags.get('access:conditional'):return False,False,'conditional'
 if not node and (tags.get('highway') in {'motorway','motorway_link','trunk','trunk_link','construction','proposed','raceway'} or tags.get('motorroad')=='yes'):return False,False,'express'
 if foot not in ALLOWED_FOOT|{'unknown'}:return False,False,'foot'
 if foot not in ALLOWED_FOOT and access not in {'unknown','yes','permissive','designated'}:return False,False,'access'
 if node:
  if tags.get('barrier') in {'wall','fence','retaining_wall','block','jersey_barrier'}:return False,False,'barrier'
  return True,foot=='unknown','node'
 if tags.get('highway') not in ORDINARY and not(tags.get('highway')=='cycleway' and foot in ALLOWED_FOOT):return False,False,'class'
 return True,foot=='unknown','game-assumed' if foot=='unknown' else 'source-tag'

def walking_directions(tags):
 value=tags.get('oneway:foot','no')
 return value!='-1', value not in {'yes','1','true'}
