import fs from "fs";
import { Octokit } from "octokit";
import type {
  GitHubPullRequest,
  ShapedGitHubPullRequest,
  GitHubCommit,
  GitHubReviewComment,
  GitHubReview,
} from "../model";
import dayjs from "dayjs";
import { shapeGitHubPullRequest } from "../shaper";

export const createFetcher = ({
  owner,
  repo,
  debug = false,
}: {
  owner: string;
  repo: string;
  debug?: boolean;
}) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const log = (...args: any) => {
    if (debug) console.log(dayjs().format("YYYY-MM-DD HH:MM:ss"), ...args);
  };

  const pulls = async () => {
    let pulls: ShapedGitHubPullRequest[] = [];
    let page = 1;
    do {
      log("pulls:", page);
      const ret = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        page,
        per_page: 100,
      });
      if (ret.data.length === 0) break;

      if (debug) {
        log(ret.data.length, "fetched");
        log(process.memoryUsage().heapUsed);
      }
      pulls = [...pulls, ...ret.data.map((pr) => shapeGitHubPullRequest(pr))];
      page++;
    } while (true);
    return pulls;
  };

  const releaseCommits = async (branch: string = "production") => {
    const commits: {
      [sha: string]: string;
    } = {};
    let page = 1;
    do {
      log("release commits:", page);
      const ret = await octokit.rest.repos.listCommits({
        owner,
        repo,

        per_page: 100,
        page,
      });
      if (ret.data.length === 0) break;

      for (const commit of ret.data) {
        if (commit.commit.author?.date) {
          commits[commit.sha] = commit.commit.author?.date;
        }
      }
      page++;
    } while (true);
    fs.writeFileSync(
      "./json/release-commits.json",
      JSON.stringify(commits, null, 2)
    );
    return commits;
  };

  const commits = async (pullNumber: number) => {
    const ret = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullNumber,
      page: 1,
      per_page: 1,
    });
    let commits: GitHubCommit[] = ret.data;
    fs.mkdirSync(`./json/${pullNumber}`, { recursive: true });
    fs.writeFileSync(
      `./json/${pullNumber}/commits.json`,
      JSON.stringify(commits, null, 2)
    );
    return commits;
  };

  const firstReviewComment = async (pullNumber: number) => {
    const ret = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      page: 1,
      per_page: 100,
    });
    const reviewComments: GitHubReviewComment[] = ret.data;
    fs.mkdirSync(`./json/${pullNumber}`, { recursive: true });
    fs.writeFileSync(
      `./json/${pullNumber}/review-comments.json`,
      JSON.stringify(reviewComments, null, 2)
    );
    return reviewComments;
  };

  const reviews = async (pullNumber: number) => {
    const ret = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      page: 1,
      per_page: 100,
    });
    const review: GitHubReview[] = ret.data;
    fs.mkdirSync(`./json/${pullNumber}`, { recursive: true });
    fs.writeFileSync(
      `./json/${pullNumber}/review.json`,
      JSON.stringify(review, null, 2)
    );
    return review;
  };

  const tags = async () => {
    // const results = [];
    const tagsRet = await octokit.rest.repos.listTags({
      owner,
      repo,
    });
    /*
    for (const tag of tagsRet.data) {
      console.log("tag", tag.name);
      const commitsRet = await octokit.rest.repos.listCommits({
        owner,
        repo,
        ref: tag.name,
        since: "",
      });
      results.push({
        name: tag.name,
        sha: tag.commit.sha,
      });
    }
    */
    return tagsRet.data;
  };

  return {
    pulls,
    releaseCommits,
    commits,
    firstReviewComment,
    reviews,
    tags,
  };
};
