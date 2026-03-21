type BlogPost = {
  id: string;
  title: string;
  date: string;
  description: string;
  author: string;
  keywords: string[];
};

type PostTocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};
