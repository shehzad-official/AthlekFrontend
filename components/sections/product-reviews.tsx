"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { ReactNode, ReactElement } from "react"
import { Star, MessageSquare, Send, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import type { Product } from "@/lib/types"

const getReviewerInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)
}

const renderReviewCard = (
  review: Review,
  renderStarsFn: (rating: number) => ReactNode,
  isTopReview = false
): ReactElement => (
  <div
    key={review._id}
    className="p-6 w-full rounded-[32px] bg-[#EAEAEA] relative overflow-hidden"
    style={{
      minHeight: 'clamp(240px, 28vw, 260px)'
    }}
  >
    {isTopReview && (
      <span className="absolute top-4 right-6 flex items-center gap-2 text-xs uppercase tracking-wide text-[#2E2E2E]">
        <Crown className="h-4 w-4 text-[#c9ff4a]" />
        Top Review
      </span>
    )}
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-full bg-black text-[#EBFF00] flex items-center justify-center text-sm font-semibold">
        {getReviewerInitials(review.customer?.name || 'Guest')}
      </div>
      <div className="flex-1">
        <h3 
          className="text-black"
          style={{
            fontFamily: "'Gilroy-Medium', 'Gilroy', sans-serif",
            fontSize: 'clamp(18px, 2.4vw, 26px)',
            letterSpacing: '-0.5px',
            fontWeight: 500
          }}
        >
          {review.customer?.name || 'Anonymous'}
        </h3>
        <p className="text-xs text-gray-500">
          {new Date(review.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
    <div className="flex items-center mb-3" style={{ gap: 'clamp(6px, 0.7vw, 8px)', height: 'clamp(16px, 1.8vw, 19px)' }}>
      {renderStarsFn(review.rating)}
    </div>
    <p 
      className="text-black mb-3"
      style={{
        fontFamily: "'Gilroy-Regular', 'Gilroy', sans-serif",
        fontSize: 'clamp(12px, 1.3vw, 16px)',
        fontWeight: 400,
        letterSpacing: '0px'
      }}
    >
      {review.comment}
    </p>
    {review.adminResponse && (
      <div className="bg-white/60 rounded-2xl p-4 border border-black/10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#212121] mb-2">
          <MessageSquare className="h-3 w-3" />
          Store Response
        </div>
        <p className="text-sm text-[#212121]">{review.adminResponse}</p>
        {review.responseDate && (
          <p className="text-xs text-gray-500 mt-2">
            {new Date(review.responseDate).toLocaleDateString()}
          </p>
        )}
      </div>
    )}
  </div>
)

interface Review {
  _id: string
  product: {
    title: string
  }
  customer: {
    name: string
    email: string
  }
  rating: number
  comment: string
  status: string
  adminResponse?: string
  responseDate?: string
  createdAt: string
}

interface ReviewStats {
  average: number
  count: number
}

interface ProductReviewsProps {
  product: Product
  onStatsChange?: (stats: ReviewStats) => void
  forceOpenFormKey?: number
}

export default function ProductReviews({ product, onStatsChange, forceOpenFormKey }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const reviewFormRef = useRef<HTMLDivElement | null>(null)
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: "",
    customerName: "",
    customerEmail: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchReviews()
  }, [product.id])

  const fetchReviews = async () => {
    try {
      const response = await fetch(`https://athlekt.com/backendnew/api/reviews/public/${product.id}`)
      if (response.ok) {
        const data = await response.json()
        const fetchedReviews: Review[] = Array.isArray(data.data) ? data.data : []
        setReviews(fetchedReviews)
        if (fetchedReviews.length > 0) {
          const ratingSum = fetchedReviews.reduce((sum, review) => sum + review.rating, 0)
          const average = ratingSum / fetchedReviews.length
          onStatsChange?.({ average, count: fetchedReviews.length })
        } else {
          onStatsChange?.({ average: 0, count: 0 })
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    if (!newReview.comment.trim() || !newReview.customerName.trim() || !newReview.customerEmail.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('https://athlekt.com/backendnew/api/reviews/public/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          rating: newReview.rating,
          comment: newReview.comment,
          customerName: newReview.customerName,
          customerEmail: newReview.customerEmail
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Review submitted successfully! It will be visible after admin approval.",
        })
        setShowReviewForm(false)
        setNewReview({
          rating: 5,
          comment: "",
          customerName: "",
          customerEmail: ""
        })
        await fetchReviews()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to submit review",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, interactive = false, onStarClick?: (rating: number) => void) => {
    const roundedRating = interactive ? rating : Math.round(rating)

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`h-4 w-4 ${star <= roundedRating ? "text-yellow-400 fill-current" : "text-gray-300"} ${
              interactive ? "cursor-pointer hover:text-yellow-400" : ""
            }`}
            onClick={() => interactive && onStarClick?.(star)}
          />
        ))}
      </div>
    )
  }

  const ReviewForm = () => (
    <div ref={reviewFormRef} className="bg-white border border-gray-200 rounded-[24px] p-6 space-y-4">
      <h3 className="text-lg font-medium text-[#212121]">Write a Review</h3>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Rating</label>
        {renderStars(newReview.rating, true, (rating) =>
          setNewReview(prev => ({ ...prev, rating }))
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Your Name</label>
          <Input
            value={newReview.customerName}
            onChange={(e) => setNewReview(prev => ({ ...prev, customerName: e.target.value }))}
            placeholder="Enter your name"
            className="bg-white border-gray-300 text-[#212121]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Your Email</label>
          <Input
            type="email"
            value={newReview.customerEmail}
            onChange={(e) => setNewReview(prev => ({ ...prev, customerEmail: e.target.value }))}
            placeholder="Enter your email"
            className="bg-white border-gray-300 text-[#212121]"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Your Review</label>
        <Textarea
          value={newReview.comment}
          onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
          placeholder="Share your experience with this product..."
          rows={4}
          className="bg-white border-gray-300 text-[#212121]"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={submitReview}
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Review"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowReviewForm(false)}
          className="border-gray-300 text-[#212121] hover:bg-gray-200"
        >
          Cancel
        </Button>
      </div>
    </div>
  )

  let totalRating = 0
  for (const review of reviews as Review[]) {
    totalRating += review.rating
  }
  const averageRating = reviews.length > 0
    ? totalRating / reviews.length
    : 0

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({
        average: averageRating,
        count: reviews.length
      })
    }
  }, [averageRating, reviews.length, onStatsChange])

  const lastForceKeyRef = useRef<number | null>(forceOpenFormKey ?? null)

  useEffect(() => {
    if (typeof forceOpenFormKey === 'number' && forceOpenFormKey !== lastForceKeyRef.current) {
      lastForceKeyRef.current = forceOpenFormKey
      setShowReviewForm(true)
      requestAnimationFrame(() => {
        reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [forceOpenFormKey])

  const { topReview, otherReviews } = useMemo(() => {
    if (reviews.length === 0) {
      return { topReview: null, otherReviews: [] as Review[] }
    }

    const sorted = [...reviews].sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return {
      topReview: sorted[0],
      otherReviews: sorted.slice(1)
    }
  }, [reviews])

  const visibleOtherReviews = useMemo(() => {
    if (showAllReviews) {
      return otherReviews
    }
    return otherReviews.slice(0, 2)
  }, [otherReviews, showAllReviews])

  const hasMoreReviews = otherReviews.length > 2

  return (
    <section className="bg-white text-[#212121] py-8">
      <div className="container mx-auto px-4 max-w-[1250px] space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 
            className="uppercase text-black mb-0"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(40px, 6.5vw, 70px)',
              letterSpacing: '-3.37px'
            }}
          >
            CUSTOMER REVIEWS
          </h1>
          {reviews.length > 0 && (
            <div className="flex items-center gap-3">
              {renderStars(averageRating)}
              <span className="text-sm text-gray-600">
                {averageRating.toFixed(1)} / 5 ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-500 mx-auto"></div>
            <p className="text-gray-500 mt-3">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
            <Star className="h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-700">No reviews yet</h3>
            <p className="text-gray-500 max-w-md">
              Be the first to share your experience with this product.
            </p>
            <Button
              onClick={() => setShowReviewForm(prev => !prev)}
              className="bg-black text-white hover:bg-gray-800 px-8 py-3 rounded-full"
            >
              {showReviewForm ? 'Cancel Review' : 'Write a Review'}
            </Button>
            {showReviewForm && <ReviewForm />}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[clamp(320px,38vw,380px)_1fr] gap-6 lg:gap-8 xl:gap-10">
            <div className="w-full lg:max-w-[clamp(320px,38vw,380px)] space-y-6">
              <div className="bg-[#F5F5F5] rounded-[32px] p-8 border border-black/5">
                <p 
                  className="text-black mb-1"
                  style={{
                    fontFamily: "'Gilroy-Medium', 'Gilroy', sans-serif",
                    fontSize: 'clamp(18px, 2vw, 25px)',
                    fontWeight: 500
                  }}
                >
                  Tried our products?
                </p>
                <p 
                  className="text-black mb-2"
                  style={{
                    fontFamily: "'Gilroy-Medium', 'Gilroy', sans-serif",
                    fontSize: 'clamp(20px, 2.4vw, 28px)',
                    letterSpacing: '-1px',
                    fontWeight: 600
                  }}
                >
                  {averageRating.toFixed(1)} out of 5
                </p>
                <div className="flex items-center" style={{ gap: 'clamp(5px, 0.6vw, 7px)', height: 'clamp(32px, 3.5vw, 40px)' }}>
                  {renderStars(averageRating)}
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
                <Button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="bg-black text-white hover:bg-gray-800 w-full mt-6"
                  style={{
                    fontFamily: "'Gilroy-Medium', 'Gilroy', sans-serif",
                    fontSize: 'clamp(14px, 1.4vw, 16px)',
                    fontWeight: 500,
                    height: 'clamp(50px, 5.5vw, 58px)',
                    borderRadius: '20px'
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showReviewForm ? 'Cancel review' : 'Write a Review'}
                </Button>
              </div>

              {showReviewForm && <ReviewForm />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 xl:gap-8 w-full items-start">
              {topReview && renderReviewCard(topReview, renderStars, true)}
              {visibleOtherReviews.map((review) => renderReviewCard(review, renderStars))}

              {hasMoreReviews && otherReviews.length > 0 && (
                <div className="md:col-span-2 text-right mt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllReviews(prev => !prev)}
                    className="uppercase text-black hover:text-gray-700"
                    style={{
                      fontFamily: "'Gilroy-Medium', 'Gilroy', sans-serif",
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {showAllReviews ? 'Show Less' : 'Read More'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
} 