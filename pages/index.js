import { useAddress, useEditionDrop, useToken, useVote } from "@thirdweb-dev/react";
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import Proposal from "../components/Proposal";
import Login from "../components/Login";
import styles from "../styles/Home.module.css";
import { AddressZero } from "@ethersproject/constants";
import Hero from "../components/Hero";


export default function Home() {
  const address = useAddress();
  const editionDrop = useEditionDrop(
    "0x032D24E5D34BE21FA3eAD8a42FC503FAD7d8314A"
  );

  const token = useToken("0xE9c326C87F5b6b3BdFEd10a528c6F68bCBa5803C");
  const vote = useVote("0x24858c1DdF47bd4CA49B8F62B1429a7817BD2dc3");

  const [hasClaimedNFT, setHasClaimedNFT] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [proposals, setProposals] = useState([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Check if the user have minted an NFT to access to the DAO:
  useEffect(() => {
    if (!address) {
      return;
    }

    const checkBalance = async () => {
      try {
        const balance = await editionDrop.balanceOf(address, 0);
        if (balance.gt(0)) {
          setHasClaimedNFT(true);
          console.log("🎉 you have a NFT! Welcome in WebX DAO");
        } else {
          setHasClaimedNFT(false);
          console.log("You don't have a NFT. Please mint it!");
        }
      } catch (error) {
        setHasClaimedNFT(false);
        console.error("Failed to get nft balance", error);
      }
    };
    checkBalance();
  }, [address, editionDrop]);

  // If the user has claimed an NFT, get the proposals of the DAO:
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    const getAllProposals = async () => {
      try {
        const proposals = await vote.getAll();
        setProposals(proposals);
      } catch (error) {
        console.error("failed to get proposals", error);
      }
    };
    getAllProposals();
  }, [hasClaimedNFT, vote]);

  // Check if the user already voted to one proposal:
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    if (!proposals.length) {
      return;
    }

    const checkIfUserHasVoted = async () => {
      try {
        // Actually it only check the first proposal, we need to check all proposals
        // and dispatch states
        const hasVoted = await vote.hasVoted(proposals[0].proposalId, address);
        setHasVoted(hasVoted);
        // proposals.forEach(proposal => {
        //   const hasVoted = await vote.hasVoted(proposal.proposalId, address);
        //   setHasVoted( ... );
        // })
        
      } catch (error) {
        console.error("Failed to check if wallet has voted", error);
      }
    };
    checkIfUserHasVoted();
  }, [hasClaimedNFT, proposals, address, vote]);

  const mintNft = async () => {
    setIsClaiming(true);
    try {
      await editionDrop.claim("0", 1);
      setHasClaimedNFT(true);
      console.log("🌊 Successfully Minted the NFT!");
    } catch (error) {
      console.error("failed to claim", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVoting(true);

    const votes = proposals.map((proposal) => {
      const voteResult = {
        proposalId: proposal.proposalId,
        vote: 2,
      };
      proposal.votes.forEach((vote) => {
        const elem = document.getElementById(
          proposal.proposalId + "-" + vote.type
        );

        if (elem.checked) {
          voteResult.vote = vote.type;
          return;
        }
      });
      return voteResult;
    });

    try {
      const delegation = await token.getDelegationOf(address);
      if (delegation === AddressZero) {
        await token.delegateTo(address);
      }
      try {
        await Promise.all(
          votes.map(async ({ proposalId, vote: _vote }) => {
            const proposal = await vote.get(proposalId);
            if (proposal.state === 1) {
              return vote.vote(proposalId, _vote);
            }
            return;
          })
        );
        try {
          await Promise.all(
            votes.map(async ({ proposalId }) => {
              const proposal = await vote.get(proposalId);

              if (proposal.state === 4) {
                return vote.execute(proposalId);
              }
            })
          );
          setHasVoted(true);
        } catch (err) {
          console.error("failed to execute votes", err);
        }
      } catch (err) {
        console.error("failed to vote", err);
      }
    } catch (err) {
      console.error("failed to delegate tokens", err);
    } finally {
      setIsVoting(false);
    }
  };
  
  if (!address) {
    // return <Login />;
    return <Hero/>

  }

  if (hasClaimedNFT) {
    return (
      <div className={styles.container}>
        <h1 className="text-2xl tracking-tight font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6 lg:text-3xl xl:text-4xl">WebX DAO Active Proposals</h1>
        <form onSubmit={handleFormSubmit}>
          {proposals.map((proposal) => (
            <Proposal
              key={proposal.proposalId}
              votes={proposal.votes}
              description={proposal.description}
              proposalId={proposal.proposalId}
            />
          ))}

          <button
            onClick={handleFormSubmit}
            type="submit"
            disabled={isVoting || hasVoted}
            className={styles.button}
          >
            {isVoting
              ? "Voting..."
              : hasVoted
              ? "You Already Voted"
              : "Submit Votes"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
    <div className={styles.container}>
      <h1 className="text-2xl tracking-tight font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6 lg:text-3xl xl:text-4xl">Mint your free WebX DAO Membership NFT 🧬</h1>
      <button
        className={styles.button}
        disabled={isClaiming}
        onClick={() => mintNft()}
      >
        {isClaiming ? "Minting..." : "Mint your NFT"}
      </button>
    </div>
    </>
  );
}
