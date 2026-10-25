import React from "react";
import { useParams } from "react-router-dom";
import { SprintBoardsHome } from "./components/SprintBoardsHome";
import { SprintBoardView } from "./components/SprintBoardView";

export const SprintAppPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();

  if (boardId) {
    return <SprintBoardView />;
  }

  return <SprintBoardsHome />;
};

export default SprintAppPage;
