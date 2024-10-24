import NextCors from "nextjs-cors"
import { supabase } from "../../utils/supabase"

const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`);
}

const fetchAllowUid = async (req: any, res: any) => {
  log("Handler invoked", 7);

  await NextCors(req, res, {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });
  log("CORS configured", 13);

  const { apikey, user_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  log(`Request parsed with apikey: ${apikey} and user_id: ${user_id}`, 16);

  const { data: dataForApp, error: appError } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey });

  if (appError) {
    log(`Error fetching dapps data: ${appError.message}`, 21);
    return res.status(500).json({ error: "Error fetching dapps data" });
  }

  log(`Data fetched for dapps: ${JSON.stringify(dataForApp)}`, 23);

  const dappId = dataForApp?.[0]?.id;
  if (!dappId) {
    log("Invalid API key or dapp_id", 26);
    return res.status(400).json({ error: "Invalid API key" });
  }
  log(`Dapp ID found: ${dappId}`, 29);

  const { data: dapp_users, error: userError } = await supabase
    .from("dapp_users")
    .select("*,users:user_id(*),dapps:dapp_id(*)")
    .match({
      uuid: user_id,
    });

  if (userError) {
    log(`Error fetching dapp users: ${userError.message}`, 37);
    return res.status(500).json({ error: "Error fetching dapp users" });
  }

  log(`Data fetched for dapp_users: ${JSON.stringify(dapp_users)}`, 39);

  const { error: stampError, data: stampData } = await supabase
    .from("stamps")
    .select("*")
    .match({
      created_by_user_id: dapp_users?.[0]?.users.id,
    });

  if (stampError) {
    log(`Error fetching stamp data: ${stampError.message}`, 46);
    return res.status(500).json({ error: "Error fetching stamp data" });
  }

  log(`Stamp data fetched: ${JSON.stringify(stampData)}`, 48);


  const { data: scoreData, error: scoreError } = await supabase
    .from("stampscore_dapps")
    .select("*,stampscore_schemas:schema_id(*)")
    .match({
      dapp_id: dapp_users?.[0]?.dapp_id,
    });

  if (scoreError) {
    log(`Error fetching score data: ${scoreError.message}`, 55);
    return res.status(500).json({ error: "Error fetching score data" });
  }

  log(`Score data fetched: ${JSON.stringify(scoreData)}`, 57);

  console.log({ scoreData })

  const { data: stampScores, error: stampScoresError } = await supabase
    .from("stampscores_available")
    .select("*")
    .match({
      schema_id: scoreData?.[0]?.schema_id,
    });
    console.log(dapp_users?.[0],'line 93',scoreData?.[0])

  if (stampScoresError) {
    log(`Error fetching stamp scores: ${stampScoresError.message}`, 64);
    return res.status(500).json({ error: "Error fetching stamp scores" });
  }

  log(`Stamp scores fetched: ${JSON.stringify(stampScores)}`, 66);

  let totalScore = 0;
  stampData?.map((item) => {
    const findObj = stampScores?.find((_) => _.stamptype_id === item.stamptype);
    log(`Stamp type: ${item.stamptype}, Found score object: ${JSON.stringify(findObj)}`, 71);
    totalScore = totalScore + (findObj?.score ?? 0);
  });

  log(`Total score calculated: ${totalScore}`, 75);

  res.send({
    error: stampError,
    scoring_schema: scoreData?.[0]?.schema_id,
    cubid_score: totalScore,
  });
  log("Response sent with score details", 80);
}

export default fetchAllowUid;
