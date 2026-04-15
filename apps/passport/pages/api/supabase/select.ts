import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../utils/supabase';

const selectTable = async (req:NextApiRequest, res:NextApiResponse) => {
  const { match = undefined, table } = req.body;
  if (match) {
    const { error, data } = await supabase.from(table).select('*').match(match);
    res.send({ error, data });
  } else {
    const { error, data } = await supabase.from(table).select('*');
    res.send({ error, data });
  }
};

export default selectTable;
