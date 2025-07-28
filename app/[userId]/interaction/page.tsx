import AnswersSection from "@/components/answersSection"
import InformationSection from "@/components/informationSection"
import QuestionsSection from "@/components/questionsSection"
import TableOfContents from "@/components/tableOfContents"

export default function Page() {
  return (
    <div className="flex justify-center items-center gap-4">
    <div className="w-full max-w-4xl flex gap-4">
      <div className="w-full flex flex-col justify-center items-center gap-4">
          <InformationSection showNavigation={false} />
          <QuestionsSection showNavigation={false} />
          <AnswersSection showNavigation={false} />
          <div className="h-[462px]"></div>
        </div>
        <TableOfContents />
      </div>
    </div>
  )
}
