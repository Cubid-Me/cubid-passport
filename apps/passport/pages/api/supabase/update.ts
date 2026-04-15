import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../utils/supabase';

const updateTable = async (req:NextApiRequest, res:NextApiResponse) => {
  const { match, body, table } = req.body;
  const { error, data } = await supabase.from(table).update(body).match(match);
  res.send({ error, data });
};

export default updateTable;
