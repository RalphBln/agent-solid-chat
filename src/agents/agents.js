const readline = require("readline-sync");

const {
  Belief,
  Desire,
  Intentions, // eslint-disable-line no-unused-vars
  Plan,
  Agent,
  Environment,
} = require("../../../JS-son/src/js-son");
const { hateSpeechTriggerWords } = require("./hateSpeechTriggerWords");

const HateSpeechType = {
  SAFE: "No hatespeech", 
  HOL: "Holocaust Denial",
  SEXISM: "Sexism",
  HOPHO: "Homophobia",
  TRANS: "Transphobia"
};

const isHateSpeech = (beliefs, message) => beliefs.triggerWords.find(triggerWord => message.includes(triggerWord))

const countHateSpeechInLastMessages = (beliefs, count) => beliefs.messages.filter(message => isHateSpeech(beliefs, message)).length

const preferenceFunctionGen = (beliefs, desires) => (desireKey) => {
  if (!desires[desireKey](beliefs)) {
    return false;
  } else if (desireKey === "eat" || !desires["eat"](beliefs)) {
    return true;
  } else {
    return false;
  }
};

const initialBeliefs = (competenceArea) => ({
  ...Belief("competenceArea", competenceArea),
  ...Belief("triggerWords", hateSpeechTriggerWords[competenceArea]),
  ...Belief("competingAgents", []),
  ...Belief("messages", []),
});

const desires = {
  ...Desire({
    id: "agentWantsToMitigateHS",
    body: (beliefs) => new Belief(),
  }),
  ...Desire({
    id: "agentWantsAssistance",
    body: (beliefs) => new Belief(),
  }),
};

const plans = [
    Plan(
        beliefs => countHateSpeech(beliefs)
    )
]

const state = {
    activeAgents: [],
    assistanceRequests: []
};

const updateState = (actions, agentId, currentState) => {
  const stateUpdate = {};
  return stateUpdate;
};

const stateFilter = (state) => state;

// For testing

const agentCompetences = [
  { id: "1", type: HateSpeechType.HOL },
  { id: "2", type: HateSpeechType.HOL },
  { id: "1", type: HateSpeechType.HOPHO },
  { id: "2", type: HateSpeechType.HOPHO },
  { id: "1", type: HateSpeechType.SEXISM },
];

const createAgents = () => {
  return agentCompetences.map(
    (competence) =>
      new Agent({
        id: `${competence.type} ${competence.id}`,
        beliefs: initialBeliefs(competence.type),
        desires: desires,
        plans: [], // todo
        determinePreferences: preferenceFunctionGen,
      })
  );
};

const environment = new Environment(
  createAgents(),
  state,
  updateState,
  stateFilter
);

const test = () => {
  var user = "user";
  console.log("Type your chat message, press enter.");
  console.log(
    'To change your user name, type "user: ", followed by your new user name, then press enter.'
  );
  console.log('To exit, type "exit", then press enter.');
  try {
    while (true) {
      const msg = readline.question(`${user}: `);

      if (msg === "exit") {
        throw new Error();
      }
      if (msg.startsWith("user: ")) {
        user = msg.slice(6);
        console.log(`User changed to ${user}.`);
      } else {
        state.message = msg;
        state.user = user;
        environment.run(1);
      }
    }
  } catch (error) {
    console.log(error);
    console.log("Quitting the chat. Bye.");
  }
};

test();
