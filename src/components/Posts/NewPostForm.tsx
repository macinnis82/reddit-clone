import { Alert, AlertIcon, Flex, Icon, Text } from "@chakra-ui/react";
import { IoDocumentText, IoImageOutline } from "react-icons/io5";
import { BiPoll } from "react-icons/bi";
import { BsLink45Deg, BsMic } from "react-icons/bs";
import TabItem from "./TabItem";
import { useState } from "react";
import TextInputs from "./PostForm/TextInputs";
import ImageUpload from "./PostForm/ImageUpload";
import { Post } from "@/src/atoms/postAtom";
import { User } from "firebase/auth";
import { useRouter } from "next/router";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { firestore, storage } from "@/src/firebase/clientApp";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import useSelectFile from "@/src/hooks/useSelectFile";

type NewPostFormProps = {
  user: User;
};

const formTabs: TabItem[] = [
  { title: "Post", icon: IoDocumentText },
  { title: "Images & Video", icon: IoImageOutline },
  { title: "Link", icon: BsLink45Deg },
  { title: "Poll", icon: BiPoll },
  { title: "Talk", icon: BsMic },
];

export type TabItem = {
  title: string;
  icon: typeof Icon.arguments;
};

const NewPostForm: React.FC<NewPostFormProps> = ({ user }) => {
  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState(formTabs[0].title);
  const [textInputs, setTextInputs] = useState({
    title: "",
    body: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const { selectedFile, setSelectedFile, onSelectFile } = useSelectFile();

  const handleCreatePost = async () => {
    const { communityId } = router.query;

    // create new post => type Post
    const newPost: Post = {
      communityId: communityId as string,
      creatorId: user.uid,
      creatorDisplayName: user.email!.split("@")[0],
      title: textInputs.title,
      body: textInputs.body,
      numberOfComments: 0,
      voteStatus: 0,
      createdAt: serverTimestamp() as Timestamp,
    };

    setLoading(true);

    // store in db in new post collection
    try {
      const postDocRef = await addDoc(collection(firestore, "posts"), newPost);

      // check for selectedfile
      if (selectedFile) {
        // store image in firebase storage =>
        const imageRef = ref(storage, `posts/${postDocRef.id}/image`);
        await uploadString(imageRef, selectedFile, "data_url");

        // use getDownloadUrl to return a url
        const downloadUrl = await getDownloadURL(imageRef);
        console.log("downloadURL -------->", downloadUrl);

        // update the post doc with the url
        await updateDoc(postDocRef, {
          imageURL: downloadUrl,
        });
      }

      // redirect back to communityPage using the router
      router.back();
    } catch (error: any) {
      console.log("handleCreatePost error", error.message);
      setError(true);
    }

    setLoading(false);
    // setTextInputs({ title: "", body: "" });
  };

  const onTextChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const {
      target: { name, value },
    } = event;

    setTextInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Flex direction="column" bg="white" borderRadius={4} mt={2}>
      <Flex width="100%">
        {formTabs.map((item) => (
          <TabItem
            key={item.title}
            item={item}
            selected={item.title === selectedTab}
            setSelectedTab={setSelectedTab}
          />
        ))}
      </Flex>
      <Flex p={4}>
        {selectedTab === "Post" && (
          <TextInputs
            textInputs={textInputs}
            handleCreatePost={handleCreatePost}
            onChange={onTextChange}
            loading={loading}
          />
        )}
        {selectedTab === "Images & Video" && (
          <ImageUpload
            selectedFile={selectedFile}
            onSelectImage={onSelectFile}
            setSelectedFile={setSelectedFile}
            setSelectedTab={setSelectedTab}
          />
        )}
      </Flex>
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Text mr={2}>Error creating post</Text>
        </Alert>
      )}
    </Flex>
  );
};

export default NewPostForm;
