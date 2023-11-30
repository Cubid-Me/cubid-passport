import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../utils/supabase';

const insertTable = async (req:NextApiRequest, res:NextApiResponse) => {
  const { body, table } = req.body;
  const { error, data } = await supabase.from(table).insert(body).select();
  res.send({ error, data });
};

export default insertTable;
