require('dotenv').config()

const axios = require('axios');

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

client.on('ready', async () => {
  console.log('READY');
  leaderboardChannel = await client.channels.fetch(process.env.LEADERBOARD_CHANNEL_ID);
  client.setInterval(refreshLeaderboard, delay);
});

client.login();