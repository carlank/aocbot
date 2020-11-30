require('dotenv').config()

const axios = require('axios');
const DOMParser = require('dom-parser');
const CronJob = require('cron').CronJob;

const { Client, MessageEmbed } = require('discord.js');

const client = new Client();

const delay = 15 * 60 * 1000; // 15 minutes, minimum API spec allows

let leaderboardChannel;

const refreshLeaderboard = async () => {
  console.log('UPDATING LEADERBOARD')
  // debugger
  const messages = await leaderboardChannel.messages.fetch()
  const messagesToClear = [...messages.values()].filter( m => m.author.id === client.user.id);
  leaderboardChannel.bulkDelete(messagesToClear);
  const leaderboardResponse = await axios.get(process.env.LEADERBOARD_URI, {
    headers: {
      'cookie': `session=${process.env.SESSION_COOKIE}`,
    }
  });
  if(leaderboardResponse.status !== 200){
    return;
  }
  const {data} = leaderboardResponse;
  const sortedMembers = Object.values(data.members).sort((a,b) => a.global_score - b.global_score);
  const ranks = [...Array(sortedMembers.length).keys()].map(rank => `#${rank+1}`);
  const usernames = sortedMembers.map(member => member.name);
  const globalScores = sortedMembers.map(member => member.global_score);
  const localScores = sortedMembers.map(member => member.local_score);
  const stars = sortedMembers.map(member => member.stars);

  const embed = new MessageEmbed()
    .setTitle(data.event)
    .addFields(
      { name: 'Rank', value: ranks, inline: true },
      { name: 'Name', value: usernames, inline: true },
      { name: 'Score', value: globalScores, inline: true },
      // { name: 'Local Score', value: localScores, inline: true },
      // { name: 'Stars', value: stars, inline: true }
    );
  leaderboardChannel.send(embed);
}

const getNewProblem = async (day = (new Date()).getUTCDate(), year = (new Date()).getUTCFullYear()) => {
  console.log('GETTING PROBLEM FOR', year, day);
  const uri = `https://adventofcode.com/${year}/day/${day}`;
  const problemResponse = await axios.get(uri);
  if(problemResponse.status !== 200){
    return;
  }
  const {data} = problemResponse;

  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(data, 'text/html');

  const dayDescription = htmlDoc.getElementsByClassName('day-desc')[0];

  const parse = (topNode, inCode = false) => {
    if(topNode.childNodes === undefined){
      return topNode.text || '';
    }
    return topNode.childNodes.reduce((acc, node) => {
      switch(node.nodeName){
        case 'h2':
          return acc + '​[**' + parse(node, inCode) + `**](${uri})` + '\n';
        case 'em':
          if(inCode){
            return acc + '`**`' + parse(node, inCode) + '`**`';
          }
          return acc + '**' + parse(node, inCode) + '**';
        case 'li':
          return acc + '  -  ' + parse(node, inCode);
        case 'a':
          console.log(node) 
          return acc + `[${parse(node, inCode)}](${node.attributes.find(a=>a.name==='href').value})`;
        case 'pre':
          return acc + '\n' + parse(node, inCode);
        case 'p':
        case 'ul':
        case 'span':
        case '#text':
          return acc + parse(node, inCode);
        case 'code':
          return acc + '`\u200b' + parse(node, true) + '\u200b`';
        default:
          return acc; 
      }
    },'');
  };

  const content = parse(dayDescription)
    + `[Click here for your input file!](${uri}/input)\n`
    + `[Click here to submit your response!](${uri})\n`;
  console.log(dayDescription)

  const chunksArr = content.match(/[\s\S]{1,2047}[\n]/g); // chunk into 2048 max chunks
  chunksArr.forEach(description => {
    problemChannel.send(
    {
      embed: {
        description
      }
    })
  })
}


client.on('ready', async () => {
  console.log('READY');

  leaderboardChannel = await client.channels.fetch(process.env.LEADERBOARD_CHANNEL_ID);
  client.setInterval(refreshLeaderboard, delay);
   
  problemChannel = await client.channels.fetch(process.env.PROBLEM_CHANNEL_ID);
  const problemJob = new CronJob('00 00 00 01-25 11 *', getNewProblem, null, true, 'America/New_York');
});

client.on('message', message => {
  if(message.author.id === process.env.ADMIN_ID){
    switch(message.content){
      case 'aoc-refresh':
        refreshLeaderboard();
        break
      case 'aoc-problems':

    }
  }
});

client.login();