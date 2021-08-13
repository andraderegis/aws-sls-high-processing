const sleep = (miliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, miliseconds);
  });
};

(async () => {
  console.log("Starting task...", new Date().toISOString());
  await sleep(2000);
  console.log("Finishing task...", new Date().toISOString());
})();
